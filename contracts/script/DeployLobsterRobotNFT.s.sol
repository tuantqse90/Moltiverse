// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/LobsterRobotNFT.sol";

contract DeployLobsterRobotNFT is Script {
    function run() external {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address royaltyReceiver = vm.envAddress("ROYALTY_RECEIVER");
        string memory baseURI = vm.envString("BASE_URI");
        string memory contractURI = vm.envString("CONTRACT_URI");

        vm.startBroadcast(deployerPrivateKey);

        LobsterRobotNFT nft = new LobsterRobotNFT(
            baseURI,
            contractURI,
            royaltyReceiver
        );

        console.log("LobsterRobotNFT deployed to:", address(nft));
        console.log("Owner:", nft.owner());
        console.log("Max Supply:", nft.MAX_SUPPLY());
        console.log("Mint Price:", nft.mintPrice());

        vm.stopBroadcast();
    }
}
