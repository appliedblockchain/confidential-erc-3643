import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import { UCEF3643Contracts } from '../..'
import TREX from '@tokenysolutions/t-rex'

export default buildModule('UCEF3643Module', (m) => {
  // Deploy mock contracts first
  const mockIdentityRegistry = m.contract('MockIdentityRegistry', [], {
    id: 'MockIdentityRegistry',
  })

  const mockCompliance = m.contract('MockCompliance', [], {
    id: 'MockCompliance',
  })

  // Deploy UCEF3643 token implementation
  const tokenImplementation = m.contract('UCEF3643', UCEF3643Contracts.UCEF3643, [], {
    id: 'UCEF3643',
  })

  // Deploy Implementation Authority
  const implementationAuthority = m.contract('MockTrexImplementationAuthority', [tokenImplementation], {
    id: 'MockTrexImplementationAuthority',
  })

  // Deploy UCEF3643 with proxy
  const tokenProxy = m.contract(
    'Token',
    TREX.contracts.TokenProxy as any,
    [
      implementationAuthority,
      mockIdentityRegistry,
      mockCompliance,
      'ConfidentialToken',
      'CONF',
      18,
      '0x0000000000000000000000000000000000000000',
    ],
    {
      id: 'TokenProxy',
      after: [implementationAuthority],
    },
  )

  // Get deployer address
  const deployerAddress = m.getAccount(0)

  const token = m.contractAt('UCEF3643', UCEF3643Contracts.UCEF3643, tokenProxy, {
    id: 'Token',
    after: [tokenProxy],
  })

  // Grant agent role to deployer
  const addAgent = m.call(token, 'addAgent', [deployerAddress], {
    id: 'addAgent',
    after: [tokenProxy],
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
    from: deployerAddress,
  })

  return {
    mockIdentityRegistry,
    mockCompliance,
    token,
    implementationAuthority,
    tokenProxy,
  }
})
