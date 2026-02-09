// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {LobsterPot} from "../src/LobsterPot.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        LobsterPot lobsterPot = new LobsterPot();

        console.log("LobsterPot deployed at:", address(lobsterPot));

        vm.stopBroadcast();
    }
}
