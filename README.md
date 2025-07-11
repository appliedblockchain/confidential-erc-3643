# Confidential ERC-3643 Token (UCEF3643)

This guide provides comprehensive instructions for testing and deploying the Confidential ERC-3643 (UCEF3643) token implementation.

## UCEF Integration with ERC-3643

This implementation combines the privacy-preserving features of UCEF (Unopinionated Confidential ERC-20 Framework) with the compliance and identity verification capabilities of ERC-3643. While ERC-3643 provides robust regulatory compliance through identity verification and transfer restrictions, UCEF adds a layer of programmable confidentiality to protect sensitive financial data.

Key benefits of this integration:
- **Programmable Privacy**: Leverages UCEF's unopinionated approach to implement confidential balances and transactions while maintaining ERC-3643's compliance features
- **Regulatory Compliance**: Preserves all ERC-3643 compliance mechanisms including identity verification and transfer restrictions
- **Flexible Implementation**: Maintains cryptographic agnosticism while enforcing privacy using standard Solidity constructs
- **Enhanced Security**: Combines identity-based access controls with confidential transaction capabilities

This hybrid approach ensures that regulated entities can benefit from privacy-preserving features while maintaining full compliance with regulatory requirements.

## Contract Features

The UCEF3643 token implementation includes:
- ERC-3643 compliance
- UCEF privacy
- Identity verification
- Compliance checks
- Token freezing capabilities
- Transfer restrictions
- Agent management
  
## Prerequisites

- Node.js (v14 or higher)
- pnpm (recommended)
- Hardhat
- Access to Silent Data credentials (for Silent Data deployment)

## Project Structure

The token implementation is located in the `contracts/ucef-3643.sol` file. The root directory includes:
- Test fixtures
- Deployment script (scripts/deploy-suite.ts)
- Ignition module (ignition/modules/UCEF3643.ts)

## Testing

### Running Tests

1. Clone the repository:
```bash
git clone <repository-url>
cd confidential-erc-3643
```

2. Install dependencies:
```bash
pnpm install
```

3. Compile contracts:
```bash
pnpm compile
```

4. Run all tests:
```bash
pnpm test
```

## Deployment

### Local Development

1. Start local Hardhat node:
```bash
pnpm chain
```

2. Configure environment:
Create a `.env` file in the root directory:
```env
PRIVATE_KEY=<deployer_private_key>
```

3. Deploy using Ignition:
```bash
pnpm deploy:module UCEF3643
```

### Silent Data Deployment

1. Configure environment:
Create a `.env` file with Silent Data credentials:
```env
PRIVATE_KEY=<deployer_private_key>
RPC_URL=<silent_data_rpc_url>
CHAIN_ID=<silent_data_chain_id>
```

2. Deploy to Silent Data:
```bash
pnpm deploy:module UCEF3643 silentdata
```

### Available Modules
| Module Name | Description |
|------------|-------------|
| UCEF3643 | Basic UCEF3643 token deployment without initialization |
| UCEF3643Init | UCEF3643 token deployment with mock registry/compliance and initialization |
| UCEF3643Proxy | UCEF3643 token deployment with proxy pattern for upgradability |


### Deployment Script

The deployment script (`scripts/deploy-suite.ts`) deploys the complete T-REX suite including:
- ClaimTopicsRegistry
- TrustedIssuersRegistry
- IdentityRegistryStorage
- IdentityRegistry
- ModularCompliance
- TREXImplementationAuthority
- Token implementation (UCEF3643)

To use the deployment script:
```bash
pnpm script deploy-suite
```

To use the deployment script with Silent Data network:
```bash
pnpm script deploy-suite silentdata
```

The script will output the deployment addresses to the a file `DeploymentOutput.json` in the `out` directory. It's possible to export the private keys of the accounts by prepending the `EXPORT_PRIVATE_KEYS` environment variable set to `true`.

```bash
EXPORT_PRIVATE_KEYS=true pnpm script deploy-suite
```

## Troubleshooting

If you encounter issues:

1. Clean build artifacts:
```bash
pnpm clean
```

2. Recompile contracts:
```bash
pnpm compile
```

3. Verify environment configuration
4. Check network connectivity
5. Ensure sufficient funds for deployment


## Important Notes

- Always test thoroughly on local network before deployment
- Keep private keys and API credentials secure
- Back up deployment addresses and transaction hashes
- Monitor gas prices for optimal deployment timing
- Ensure all required contracts are properly deployed in the correct order

## Development Workflow

1. Make changes to contracts
2. Run tests to verify changes
3. Deploy to local network for testing
4. Deploy to testnet if required
5. Deploy to production network

## Security Considerations

- Verify all contract interactions
- Implement proper access controls
- Test all security-critical functions
- Review compliance requirements
- Monitor for potential vulnerabilities

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
