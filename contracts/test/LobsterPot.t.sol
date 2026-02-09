// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {LobsterPot} from "../src/LobsterPot.sol";

contract LobsterPotTest is Test {
    LobsterPot public pot;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    uint256 constant ENTRY_FEE = 0.01 ether;
    uint256 constant ROUND_DURATION = 10 minutes;

    function setUp() public {
        pot = new LobsterPot();

        // Fund test accounts
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(charlie, 10 ether);
    }

    function test_JoinPot() public {
        vm.prank(alice);
        pot.joinPot{value: ENTRY_FEE}();

        assertEq(pot.totalPotAmount(), ENTRY_FEE);
        assertTrue(pot.hasJoined(alice));
        assertEq(pot.gamesPlayed(alice), 1);
    }

    function test_JoinPot_InvalidFee() public {
        vm.prank(alice);
        vm.expectRevert(LobsterPot.InvalidEntryFee.selector);
        pot.joinPot{value: 0.02 ether}();
    }

    function test_JoinPot_AlreadyJoined() public {
        vm.startPrank(alice);
        pot.joinPot{value: ENTRY_FEE}();

        vm.expectRevert(LobsterPot.AlreadyJoined.selector);
        pot.joinPot{value: ENTRY_FEE}();
        vm.stopPrank();
    }

    function test_DrawWinner() public {
        // Join with multiple participants
        vm.prank(alice);
        pot.joinPot{value: ENTRY_FEE}();

        vm.prank(bob);
        pot.joinPot{value: ENTRY_FEE}();

        // Fast forward past round duration
        vm.warp(block.timestamp + ROUND_DURATION + 1);

        uint256 aliceBalanceBefore = alice.balance;
        uint256 bobBalanceBefore = bob.balance;

        pot.drawWinner();

        // One of them should have won
        address winner = pot.roundWinners(1);
        assertTrue(winner == alice || winner == bob);

        // Check prize was distributed (minus 2.5% fee)
        uint256 expectedPrize = (ENTRY_FEE * 2 * 9750) / 10000;
        if (winner == alice) {
            assertEq(alice.balance, aliceBalanceBefore + expectedPrize);
        } else {
            assertEq(bob.balance, bobBalanceBefore + expectedPrize);
        }
    }

    function test_DrawWinner_NotEnoughParticipants() public {
        vm.prank(alice);
        pot.joinPot{value: ENTRY_FEE}();

        vm.warp(block.timestamp + ROUND_DURATION + 1);

        vm.expectRevert(LobsterPot.NotEnoughParticipants.selector);
        pot.drawWinner();
    }

    function test_DrawWinner_RoundNotEnded() public {
        vm.prank(alice);
        pot.joinPot{value: ENTRY_FEE}();

        vm.prank(bob);
        pot.joinPot{value: ENTRY_FEE}();

        vm.expectRevert(LobsterPot.RoundNotEnded.selector);
        pot.drawWinner();
    }

    function test_GetCurrentRoundInfo() public {
        vm.prank(alice);
        pot.joinPot{value: ENTRY_FEE}();

        (
            uint256 round,
            uint256 startTime,
            uint256 endTime,
            uint256 potAmount,
            uint256 participantCount,
            bool isEnded
        ) = pot.getCurrentRoundInfo();

        assertEq(round, 1);
        assertEq(potAmount, ENTRY_FEE);
        assertEq(participantCount, 1);
        assertFalse(isEnded);
        assertEq(endTime - startTime, ROUND_DURATION);
    }

    function test_GetTimeRemaining() public {
        uint256 timeRemaining = pot.getTimeRemaining();
        assertGt(timeRemaining, 0);
        assertLe(timeRemaining, ROUND_DURATION);

        vm.warp(block.timestamp + ROUND_DURATION + 1);
        assertEq(pot.getTimeRemaining(), 0);
    }

    function test_ForceNewRound() public {
        vm.prank(alice);
        pot.joinPot{value: ENTRY_FEE}();

        uint256 aliceBalanceBefore = alice.balance;

        vm.warp(block.timestamp + ROUND_DURATION + 1);

        pot.forceNewRound();

        // Alice should be refunded
        assertEq(alice.balance, aliceBalanceBefore + ENTRY_FEE);
        assertEq(pot.currentRound(), 2);
    }

    function test_MultipleRounds() public {
        // Round 1
        vm.prank(alice);
        pot.joinPot{value: ENTRY_FEE}();
        vm.prank(bob);
        pot.joinPot{value: ENTRY_FEE}();

        vm.warp(block.timestamp + ROUND_DURATION + 1);
        pot.drawWinner();

        // Round 2
        assertEq(pot.currentRound(), 2);
        assertEq(pot.totalPotAmount(), 0);
        assertFalse(pot.hasJoined(alice));
        assertFalse(pot.hasJoined(bob));

        // Can join again
        vm.prank(alice);
        pot.joinPot{value: ENTRY_FEE}();
        assertEq(pot.gamesPlayed(alice), 2);
    }

    function test_Pause() public {
        pot.pause();

        vm.prank(alice);
        vm.expectRevert();
        pot.joinPot{value: ENTRY_FEE}();

        pot.unpause();

        vm.prank(alice);
        pot.joinPot{value: ENTRY_FEE}();
        assertTrue(pot.hasJoined(alice));
    }
}
