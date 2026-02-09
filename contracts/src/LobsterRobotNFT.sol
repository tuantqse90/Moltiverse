// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LobsterRobotNFT
 * @notice Official NFT collection for LobsterPot on Monad
 * @dev ERC-721 with EIP-2981 royalties for Magic Eden compatibility
 */
contract LobsterRobotNFT is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    ERC2981,
    Ownable,
    ReentrancyGuard
{
    using Strings for uint256;

    // ═══════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════

    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant MAX_PER_WALLET = 20;
    uint96 public constant ROYALTY_FEE = 500; // 5% royalty for Magic Eden

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMIZABLE MINT PRICE
    // ═══════════════════════════════════════════════════════════════

    uint256 public mintPrice = 10 ether; // Default 10 MON, can be changed

    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════

    string public baseURI;
    string public contractURI; // Collection metadata for Magic Eden
    bool public mintingEnabled;
    bool public revealed;
    string public hiddenMetadataURI;

    uint256 private _tokenIdCounter;

    // Mapping from token ID to seed (for trait generation)
    mapping(uint256 => uint256) public tokenSeeds;

    // Mapping to track mints per wallet
    mapping(address => uint256) public mintsPerWallet;

    // Whitelist for free mints (pMON holders)
    mapping(address => bool) public whitelist;
    mapping(address => bool) public whitelistClaimed;

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    event Minted(address indexed to, uint256 indexed tokenId, uint256 seed);
    event MintingToggled(bool enabled);
    event Revealed(string baseURI);
    event WhitelistAdded(address[] addresses);
    event ContractURIUpdated(string uri);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);

    // ═══════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════

    constructor(
        string memory _initBaseURI,
        string memory _contractURI,
        address _royaltyReceiver
    ) ERC721("Lobster Robot", "LBSTR") Ownable(msg.sender) {
        baseURI = _initBaseURI;
        contractURI = _contractURI;

        // Set default royalty (5% to royalty receiver)
        _setDefaultRoyalty(_royaltyReceiver, ROYALTY_FEE);
    }

    // ═══════════════════════════════════════════════════════════════
    // MINTING
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Mint a Lobster Robot NFT
     * @param seed The seed for trait generation (usually from wallet address)
     */
    function mint(uint256 seed) external payable nonReentrant {
        require(mintingEnabled, "Minting not enabled");
        require(_tokenIdCounter < MAX_SUPPLY, "Max supply reached");
        require(mintsPerWallet[msg.sender] < MAX_PER_WALLET, "Max per wallet reached");

        // Check payment (whitelist gets free mint)
        if (whitelist[msg.sender] && !whitelistClaimed[msg.sender]) {
            whitelistClaimed[msg.sender] = true;
        } else {
            require(msg.value >= mintPrice, "Insufficient payment");
        }

        _mintInternal(msg.sender, seed);
    }

    /**
     * @notice Mint with custom seed (for pMON integration)
     * @param to Address to mint to
     * @param seed Custom seed for traits
     */
    function mintTo(address to, uint256 seed) external payable nonReentrant {
        require(mintingEnabled, "Minting not enabled");
        require(_tokenIdCounter < MAX_SUPPLY, "Max supply reached");
        require(mintsPerWallet[to] < MAX_PER_WALLET, "Max per wallet reached");
        require(msg.value >= mintPrice, "Insufficient payment");

        _mintInternal(to, seed);
    }

    /**
     * @notice Batch mint (max 5 at a time)
     * @param seeds Array of seeds for each NFT
     */
    function batchMint(uint256[] calldata seeds) external payable nonReentrant {
        require(mintingEnabled, "Minting not enabled");
        require(seeds.length > 0 && seeds.length <= 5, "Invalid batch size");
        require(_tokenIdCounter + seeds.length <= MAX_SUPPLY, "Would exceed max supply");
        require(mintsPerWallet[msg.sender] + seeds.length <= MAX_PER_WALLET, "Would exceed max per wallet");
        require(msg.value >= mintPrice * seeds.length, "Insufficient payment");

        for (uint256 i = 0; i < seeds.length; i++) {
            _mintInternal(msg.sender, seeds[i]);
        }
    }

    /**
     * @dev Internal mint function
     */
    function _mintInternal(address to, uint256 seed) internal {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        tokenSeeds[tokenId] = seed;
        mintsPerWallet[to]++;

        _safeMint(to, tokenId);

        emit Minted(to, tokenId, seed);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Toggle minting on/off
     */
    function toggleMinting() external onlyOwner {
        mintingEnabled = !mintingEnabled;
        emit MintingToggled(mintingEnabled);
    }

    /**
     * @notice Reveal the collection
     * @param _newBaseURI The actual metadata URI
     */
    function reveal(string memory _newBaseURI) external onlyOwner {
        revealed = true;
        baseURI = _newBaseURI;
        emit Revealed(_newBaseURI);
    }

    /**
     * @notice Set hidden metadata URI (pre-reveal)
     */
    function setHiddenMetadataURI(string memory _uri) external onlyOwner {
        hiddenMetadataURI = _uri;
    }

    /**
     * @notice Set base URI
     */
    function setBaseURI(string memory _uri) external onlyOwner {
        baseURI = _uri;
    }

    /**
     * @notice Set contract URI (for Magic Eden collection metadata)
     */
    function setContractURI(string memory _uri) external onlyOwner {
        contractURI = _uri;
        emit ContractURIUpdated(_uri);
    }

    /**
     * @notice Set mint price (in wei)
     * @param _newPrice New mint price
     */
    function setMintPrice(uint256 _newPrice) external onlyOwner {
        uint256 oldPrice = mintPrice;
        mintPrice = _newPrice;
        emit MintPriceUpdated(oldPrice, _newPrice);
    }

    /**
     * @notice Add addresses to whitelist
     */
    function addToWhitelist(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = true;
        }
        emit WhitelistAdded(addresses);
    }

    /**
     * @notice Remove from whitelist
     */
    function removeFromWhitelist(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = false;
        }
    }

    /**
     * @notice Update royalty info
     */
    function setRoyaltyInfo(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @notice Withdraw contract balance
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @notice Owner mint (free, for giveaways)
     */
    function ownerMint(address to, uint256 seed) external onlyOwner {
        require(_tokenIdCounter < MAX_SUPPLY, "Max supply reached");
        _mintInternal(to, seed);
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Get token URI
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(tokenId);

        if (!revealed) {
            return hiddenMetadataURI;
        }

        return string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
    }

    /**
     * @notice Get total minted
     */
    function totalMinted() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @notice Get remaining supply
     */
    function remainingSupply() public view returns (uint256) {
        return MAX_SUPPLY - _tokenIdCounter;
    }

    /**
     * @notice Check if address can mint
     */
    function canMint(address addr) public view returns (bool) {
        return mintingEnabled &&
               _tokenIdCounter < MAX_SUPPLY &&
               mintsPerWallet[addr] < MAX_PER_WALLET;
    }

    /**
     * @notice Get mint cost for address
     */
    function getMintCost(address addr) public view returns (uint256) {
        if (whitelist[addr] && !whitelistClaimed[addr]) {
            return 0;
        }
        return mintPrice;
    }

    // ═══════════════════════════════════════════════════════════════
    // OVERRIDES
    // ═══════════════════════════════════════════════════════════════

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
