// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title TREX Deploy Suite Contract
 * @notice Required to compile the artifacts used by `deploy-suite.ts` script
 */

import "@tokenysolutions/t-rex/contracts/registry/implementation/ClaimTopicsRegistry.sol";
import "@tokenysolutions/t-rex/contracts/registry/implementation/TrustedIssuersRegistry.sol";
import "@tokenysolutions/t-rex/contracts/registry/implementation/IdentityRegistryStorage.sol";
import "@tokenysolutions/t-rex/contracts/registry/implementation/IdentityRegistry.sol";
import "@tokenysolutions/t-rex/contracts/compliance/modular/ModularCompliance.sol";
import "@tokenysolutions/t-rex/contracts/proxy/authority/TREXImplementationAuthority.sol";
import "@tokenysolutions/t-rex/contracts/factory/TREXFactory.sol";
import "@tokenysolutions/t-rex/contracts/proxy/ClaimTopicsRegistryProxy.sol";
import "@tokenysolutions/t-rex/contracts/registry/implementation/ClaimTopicsRegistry.sol";
import "@tokenysolutions/t-rex/contracts/proxy/TrustedIssuersRegistryProxy.sol";
import "@tokenysolutions/t-rex/contracts/registry/implementation/TrustedIssuersRegistry.sol";
import "@tokenysolutions/t-rex/contracts/proxy/IdentityRegistryStorageProxy.sol";
import "@tokenysolutions/t-rex/contracts/registry/implementation/IdentityRegistryStorage.sol";
import "@tokenysolutions/t-rex/contracts/compliance/legacy/DefaultCompliance.sol";
import "@tokenysolutions/t-rex/contracts/proxy/IdentityRegistryProxy.sol";
import "@tokenysolutions/t-rex/contracts/proxy/TokenProxy.sol";
import "@onchain-id/solidity/contracts/Identity.sol";
import "@onchain-id/solidity/contracts/proxy/ImplementationAuthority.sol";
import "@onchain-id/solidity/contracts/proxy/IdentityProxy.sol";
import "@onchain-id/solidity/contracts/factory/IdFactory.sol";
import "@onchain-id/solidity/contracts/ClaimIssuer.sol";

contract DeploySuite {}