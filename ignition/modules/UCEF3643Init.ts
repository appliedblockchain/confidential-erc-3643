import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import { UCEF3643Contracts } from '../..'

export default buildModule('UCEF3643Module', (m) => {
  // Deploy mock contracts first
  const mockIdentityRegistry = m.contract('MockIdentityRegistry', [], {
    id: 'MockIdentityRegistry',
  })

  const mockCompliance = m.contract('MockCompliance', [], {
    id: 'MockCompliance',
  })

  // Deploy UCEF3643 token
  const token = m.contract('UCEF3643', UCEF3643Contracts.UCEF3643, [], {
    id: 'UCEF3643',
  })

  // Get deployer address
  const deployerAddress = m.getAccount(0)

  // Initialize the token with mock contracts
  const initToken = m.call(
    token,
    'init',
    [
      mockIdentityRegistry,
      mockCompliance,
      'ConfidentialToken',
      'CONF',
      18,
      '0x0000000000000000000000000000000000000000', // onchainID
    ],
    {
      id: 'initializeToken',
      after: [mockIdentityRegistry, mockCompliance, token],
    },
  )

  // Grant agent role to deployer
  const addAgent = m.call(token, 'addAgent', [deployerAddress], {
    id: 'addAgent',
    after: [initToken],
  })

  // Register and verify deployer identity
  m.call(
    mockIdentityRegistry,
    'registerIdentity',
    [
      deployerAddress,
      1, // country code
      true, // isVerified
    ],
    {
      id: 'registerIdentity',
      after: [addAgent],
    },
  )

  // Set up mock to allow minting
  m.call(
    mockCompliance,
    'setCanTransfer',
    [
      '0x0000000000000000000000000000000000000000', // Zero address for minting
      true,
    ],
    {
      id: 'setupMint',
      after: [addAgent],
    },
  )

  // Unpause the token
  m.call(token, 'unpause', [], {
    id: 'unpauseToken',
    after: [addAgent],
  })

  return {
    mockIdentityRegistry,
    mockCompliance,
    token,
  }
})
