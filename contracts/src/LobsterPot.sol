// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LobsterPot
 * @notice A fun lottery game for AI agents on Monad
 * @dev 10-minute lottery cycles where agents throw 0.01 MON into the pot
 */
contract LobsterPot is ReentrancyGuard, Ownable, Pausable {
    // Constants
    uint256 public constant ENTRY_FEE = 0.01 ether; // 0.01 MON
    uint256 public constant ROUND_DURATION = 10 minutes;
    uint256 public constant PROTOCOL_FEE_BPS = 250; // 2.5% fee
    uint256 public constant MIN_PARTICIPANTS = 2;

    // State variables
    uint256 public currentRound;
    uint256 public roundStartTime;
    uint256 public totalPotAmount;

    // Participants for current round
    address[] public participants;
    mapping(address => bool) public hasJoinedCurrentRound;

    // Historical data
    mapping(uint256 => address) public roundWinners;
    mapping(uint256 => uint256) public roundPrizes;
    mapping(uint256 => uint256) public roundParticipantCount;
    mapping(address => uint256) public totalWinnings;
    mapping(address => uint256) public gamesPlayed;
    mapping(address => uint256) public gamesWon;

    // Events
    event RoundStarted(uint256 indexed round, uint256 startTime, uint256 endTime);
    event LobsterJoined(address indexed agent, uint256 indexed round, uint256 potTotal);
    event LobsterBoiled(address indexed winner, uint256 amount, uint256 indexed round, uint256 participantCount);
    event ProtocolFeeCollected(uint256 amount);
    event EmergencyWithdraw(address indexed to, uint256 amount);

    // Errors
    error InvalidEntryFee();
    error AlreadyJoined();
    error RoundNotEnded();
    error RoundEnded();
    error NotEnoughParticipants();
    error TransferFailed();
    error NoParticipants();

    constructor() Ownable(msg.sender) {
        _startNewRound();
    }

    /**
     * @notice Join the current lottery round
     * @dev Requires exactly 0.01 MON entry fee
     */
    function joinPot() external payable nonReentrant whenNotPaused {
        if (msg.value != ENTRY_FEE) revert InvalidEntryFee();
        if (hasJoinedCurrentRound[msg.sender]) revert AlreadyJoined();

        // Check if round has ended, if so draw winner first
        if (block.timestamp >= roundStartTime + ROUND_DURATION && participants.length >= MIN_PARTICIPANTS) {
            _drawWinner();
        } else if (block.timestamp >= roundStartTime + ROUND_DURATION) {
            // Not enough participants, start new round
            _startNewRound();
        }

        // Add participant
        participants.push(msg.sender);
        hasJoinedCurrentRound[msg.sender] = true;
        totalPotAmount += msg.value;
        gamesPlayed[msg.sender]++;

        emit LobsterJoined(msg.sender, currentRound, totalPotAmount);
    }

    /**
     * @notice Draw the winner for the current round
     * @dev Can be called by anyone after round ends
     */
    function drawWinner() external nonReentrant whenNotPaused {
        if (block.timestamp < roundStartTime + ROUND_DURATION) revert RoundNotEnded();
        if (participants.length < MIN_PARTICIPANTS) revert NotEnoughParticipants();

        _drawWinner();
    }

    /**
     * @notice Force start a new round (only if current round has no/few participants)
     * @dev Useful when round ends with less than MIN_PARTICIPANTS
     */
    function forceNewRound() external nonReentrant whenNotPaused {
        if (block.timestamp < roundStartTime + ROUND_DURATION) revert RoundNotEnded();
        if (participants.length >= MIN_PARTICIPANTS) revert NotEnoughParticipants();

        // Refund existing participants
        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            (bool success, ) = participant.call{value: ENTRY_FEE}("");
            if (!success) revert TransferFailed();
        }

        _startNewRound();
    }

    /**
     * @notice Internal function to draw winner
     */
    function _drawWinner() internal {
        if (participants.length == 0) revert NoParticipants();

        // Generate pseudo-random number
        // Note: For production, use Chainlink VRF or similar
        uint256 randomNumber = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    participants.length,
                    totalPotAmount
                )
            )
        );

        uint256 winnerIndex = randomNumber % participants.length;
        address winner = participants[winnerIndex];

        // Calculate prize and fee
        uint256 protocolFee = (totalPotAmount * PROTOCOL_FEE_BPS) / 10000;
        uint256 prize = totalPotAmount - protocolFee;

        // Record winner
        roundWinners[currentRound] = winner;
        roundPrizes[currentRound] = prize;
        roundParticipantCount[currentRound] = participants.length;
        totalWinnings[winner] += prize;
        gamesWon[winner]++;

        // Transfer prize to winner
        (bool success, ) = winner.call{value: prize}("");
        if (!success) revert TransferFailed();

        emit LobsterBoiled(winner, prize, currentRound, participants.length);
        emit ProtocolFeeCollected(protocolFee);

        // Start new round
        _startNewRound();
    }

    /**
     * @notice Start a new round
     */
    function _startNewRound() internal {
        currentRound++;
        roundStartTime = block.timestamp;
        totalPotAmount = 0;

        // Clear participants
        for (uint256 i = 0; i < participants.length; i++) {
            hasJoinedCurrentRound[participants[i]] = false;
        }
        delete participants;

        emit RoundStarted(currentRound, roundStartTime, roundStartTime + ROUND_DURATION);
    }

    // View functions

    /**
     * @notice Get current round info
     */
    function getCurrentRoundInfo() external view returns (
        uint256 round,
        uint256 startTime,
        uint256 endTime,
        uint256 potAmount,
        uint256 participantCount,
        bool isEnded
    ) {
        return (
            currentRound,
            roundStartTime,
            roundStartTime + ROUND_DURATION,
            totalPotAmount,
            participants.length,
            block.timestamp >= roundStartTime + ROUND_DURATION
        );
    }

    /**
     * @notice Get all participants for current round
     */
    function getParticipants() external view returns (address[] memory) {
        return participants;
    }

    /**
     * @notice Get time remaining in current round
     */
    function getTimeRemaining() external view returns (uint256) {
        uint256 endTime = roundStartTime + ROUND_DURATION;
        if (block.timestamp >= endTime) return 0;
        return endTime - block.timestamp;
    }

    /**
     * @notice Check if an address has joined current round
     */
    function hasJoined(address agent) external view returns (bool) {
        return hasJoinedCurrentRound[agent];
    }

    /**
     * @notice Get agent stats
     */
    function getAgentStats(address agent) external view returns (
        uint256 played,
        uint256 won,
        uint256 winnings
    ) {
        return (gamesPlayed[agent], gamesWon[agent], totalWinnings[agent]);
    }

    /**
     * @notice Get round history
     */
    function getRoundInfo(uint256 round) external view returns (
        address winner,
        uint256 prize,
        uint256 participantCount
    ) {
        return (roundWinners[round], roundPrizes[round], roundParticipantCount[round]);
    }

    // Admin functions

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Withdraw protocol fees
     */
    function withdrawFees(address to) external onlyOwner {
        uint256 balance = address(this).balance - totalPotAmount;
        if (balance > 0) {
            (bool success, ) = to.call{value: balance}("");
            if (!success) revert TransferFailed();
        }
    }

    /**
     * @notice Emergency withdraw all funds
     */
    function emergencyWithdraw(address to) external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = to.call{value: balance}("");
        if (!success) revert TransferFailed();
        emit EmergencyWithdraw(to, balance);
    }

    receive() external payable {}
}
