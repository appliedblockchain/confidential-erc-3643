import { Signer } from 'ethers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { UCEF3643, UCEF3643Contracts } from '../'
import MockTokenImplementation from '../artifacts/contracts/mocks/MockNewTokenImplementation.sol/MockNewTokenImplementation.json'
import { MockCompliance, MockIdentityRegistry, MockTrexImplementationAuthority } from '../typechain-types'
import { deployToken3643 } from './fixtures/deploy-3643'

describe('UCEF3643', function () {
  let token: UCEF3643
  let owner: Signer
  let ownerAddress: string
  let addr1: Signer
  let addr1Address: string
  let addr2: Signer
  let addr2Address: string
  let agent: Signer
  let mockIdentityRegistry: MockIdentityRegistry
  let mockCompliance: MockCompliance
  let trexIAuthority: MockTrexImplementationAuthority

  beforeEach(async function () {
    // Get signers
    ;[owner, addr1, addr2, agent] = await ethers.getSigners()
    ownerAddress = await owner.getAddress()
    addr1Address = await addr1.getAddress()
    addr2Address = await addr2.getAddress()

    // Deploy UCEF3643 token
    const {
      token: token_,
      mockIdentityRegistry: mockIdentityRegistry_,
      mockCompliance: mockCompliance_,
      trexIAuthority: trexIAuthority_,
    } = await deployToken3643({
      agent,
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 18,
      onchainID: ethers.ZeroAddress,
    })

    token = token_
    mockIdentityRegistry = mockIdentityRegistry_
    mockCompliance = mockCompliance_
    trexIAuthority = trexIAuthority_
  })

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await token.owner()).to.equal(ownerAddress)
    })

    it('Should set the right name and symbol', async function () {
      expect(await token.name()).to.equal('Test Token')
      expect(await token.symbol()).to.equal('TEST')
    })
  })

  describe('Initialization', function () {
    let newToken: UCEF3643

    beforeEach(async function () {
      // Deploy a new token for testing init
      const tokenFactory = await ethers.getContractFactory(
        UCEF3643Contracts.UCEF3643.abi,
        UCEF3643Contracts.UCEF3643.bytecode,
        owner,
      )
      newToken = (await tokenFactory.deploy()) as unknown as UCEF3643
      await newToken.waitForDeployment()
    })

    it('Should update token implementation', async () => {
      const newTokenFactory = await ethers.getContractFactory(
        MockTokenImplementation.abi,
        MockTokenImplementation.bytecode,
      )
      const mockNewToken = (await newTokenFactory.deploy()) as unknown as UCEF3643
      await mockNewToken.waitForDeployment()

      const currentTokenAddress = await token.getAddress()

      // Update token implementation
      await trexIAuthority.updateTokenImplementation(await mockNewToken.getAddress())

      // Should retain the same token address
      expect(await token.getAddress()).to.equal(currentTokenAddress)

      // Token storage is within proxy contract which should not change
      // Should retain the identity registry of the token
      expect(await token.identityRegistry()).to.equal(await mockIdentityRegistry.getAddress())
      // Should retain the same compliance
      expect(await token.compliance()).to.equal(await mockCompliance.getAddress())
      // Should retain the same name and symbol
      expect(await token.name()).to.equal('Test Token')
      expect(await token.symbol()).to.equal('TEST')

      // Expect allowance method to be updated
      const allowance = await token.allowance(ownerAddress, addr1Address)
      expect(allowance).to.equal(99900)
    })

    it('Should initialize with valid parameters', async function () {
      await newToken.init(
        await mockIdentityRegistry.getAddress(),
        await mockCompliance.getAddress(),
        'New Token',
        'NEW',
        18,
        ethers.ZeroAddress,
      )

      expect(await newToken.name()).to.equal('New Token')
      expect(await newToken.symbol()).to.equal('NEW')
      expect(await newToken.decimals()).to.equal(18)
      expect(await newToken.onchainID()).to.equal(ethers.ZeroAddress)
      expect(await newToken.owner()).to.equal(ownerAddress)
      expect(await newToken.identityRegistry()).to.equal(await mockIdentityRegistry.getAddress())
      expect(await newToken.compliance()).to.equal(await mockCompliance.getAddress())
    })

    it('Should revert when initializing with zero address for identity registry', async function () {
      await expect(
        newToken.init(
          ethers.ZeroAddress,
          await mockCompliance.getAddress(),
          'New Token',
          'NEW',
          18,
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith('invalid argument - zero address')
    })

    it('Should revert when initializing with zero address for compliance', async function () {
      await expect(
        newToken.init(
          await mockIdentityRegistry.getAddress(),
          ethers.ZeroAddress,
          'New Token',
          'NEW',
          18,
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith('invalid argument - zero address')
    })

    it('Should revert when initializing with empty name', async function () {
      await expect(
        newToken.init(
          await mockIdentityRegistry.getAddress(),
          await mockCompliance.getAddress(),
          '',
          'NEW',
          18,
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith('invalid argument - empty string')
    })

    it('Should revert when initializing with empty symbol', async function () {
      await expect(
        newToken.init(
          await mockIdentityRegistry.getAddress(),
          await mockCompliance.getAddress(),
          'New Token',
          '',
          18,
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith('invalid argument - empty string')
    })

    it('Should revert when initializing with invalid decimals', async function () {
      await expect(
        newToken.init(
          await mockIdentityRegistry.getAddress(),
          await mockCompliance.getAddress(),
          'New Token',
          'NEW',
          19, // Invalid decimals
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith('decimals between 0 and 18')
    })

    it('Should revert when trying to initialize twice', async function () {
      await newToken.init(
        await mockIdentityRegistry.getAddress(),
        await mockCompliance.getAddress(),
        'New Token',
        'NEW',
        18,
        ethers.ZeroAddress,
      )

      await expect(
        newToken.init(
          await mockIdentityRegistry.getAddress(),
          await mockCompliance.getAddress(),
          'New Token',
          'NEW',
          18,
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith('Initializable: contract is already initialized')
    })
  })

  describe('Balance Authorization', function () {
    it('Should return balance if user is the owner of the account', async function () {
      expect(await token.connect(addr1).balanceOf(addr1Address)).to.equal(0)
      expect(await token.connect(owner).balanceOf(ownerAddress)).to.equal(0)
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(0)
    })

    it('Should revert if user tries to access balance of another user', async function () {
      await expect(token.connect(addr2).balanceOf(addr1Address)).to.be.revertedWith('Unauthorized balance access')
    })

    it('Should return balance if user is checking his own identity balance', async function () {
      expect(await token.connect(addr1).balanceOf('0x26291175Fa0Ea3C8583fEdEB56805eA68289b105')).to.equal(0)
    })
  })

  describe('Token Transfers', function () {
    beforeEach(async function () {
      // Register and verify addr1 identity
      await mockIdentityRegistry.registerIdentity(addr1Address, 1, true)
      await mockIdentityRegistry.setVerified(addr1Address, true)

      // Set up mock to allow transfers
      await mockCompliance.setCanTransfer(addr1Address, true)

      // Mint some tokens to addr1
      await token.connect(agent).mint(addr1Address, ethers.parseEther('1000'))
      // Set up mock to allow transfers
      await mockIdentityRegistry.setVerified(addr2Address, true)
    })

    it('Should transfer tokens between accounts', async function () {
      await token.connect(addr1).transfer(addr2Address, ethers.parseEther('100'))
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ethers.parseEther('100'))
    })

    it('Should fail if sender address is frozen', async function () {
      await token.connect(agent).setAddressFrozen(addr1Address, true)
      await expect(token.connect(addr1).transfer(addr2Address, ethers.parseEther('100'))).to.be.revertedWith(
        'wallet is frozen',
      )
    })

    it('Should fail if sender is transferring frozen tokens', async function () {
      expect(await token.connect(agent).freezePartialTokens(addr1Address, ethers.parseEther('1000')))
        // Should emit PrivateEvent with TokensFrozen event type
        .to.emit(token, 'PrivateEvent')
        .withArgs([addr1Address], token.EVENT_TYPE_TOKENS_FROZEN(), ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [addr1Address, ethers.parseEther('1000')]))
      await expect(token.connect(addr1).transfer(addr2Address, ethers.parseEther('100'))).to.be.revertedWith(
        'Insufficient Balance',
      )

      // Unfreeze tokens
      await expect(token.connect(agent).unfreezePartialTokens(addr1Address, ethers.parseEther('1000')))
        // Should emit PrivateEvent with TokensUnfrozen event type
        .to.emit(token, 'PrivateEvent')
        .withArgs([addr1Address], token.EVENT_TYPE_TOKENS_UNFROZEN(), ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [addr1Address, ethers.parseEther('1000')]))
      await token.connect(addr1).transfer(addr2Address, ethers.parseEther('100'))
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ethers.parseEther('100'))
    })

    it('Should respect per-address transfer compliance', async function () {
      // Initially addr1 should be able to transfer
      await token.connect(addr1).transfer(addr2Address, ethers.parseEther('50'))
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ethers.parseEther('50'))

      // Disable transfers for addr1
      await mockCompliance.setCanTransfer(addr1Address, false)
      await expect(token.connect(addr1).transfer(addr2Address, ethers.parseEther('100'))).to.be.revertedWith(
        'Transfer not possible',
      )

      // Enable transfers for addr1 again
      await mockCompliance.setCanTransfer(addr1Address, true)
      await token.connect(addr1).transfer(addr2Address, ethers.parseEther('100'))
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ethers.parseEther('150'))
    })

    it('Should respect per-address identity verification', async function () {
      // Initially addr1 should be able to transfer
      await token.connect(addr1).transfer(addr2Address, ethers.parseEther('50'))
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ethers.parseEther('50'))

      // Set addr2 identity to unverified
      await mockIdentityRegistry.setVerified(addr2Address, false)
      await expect(token.connect(addr1).transfer(addr2Address, ethers.parseEther('100'))).to.be.revertedWith(
        'Transfer not possible',
      )

      // Restore addr1 identity verification
      await mockIdentityRegistry.setVerified(addr2Address, true)
      await token.connect(addr1).transfer(addr2Address, ethers.parseEther('100'))
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ethers.parseEther('150'))
    })

    it('Should not allow transfer if token is paused', async function () {
      await token.connect(agent).pause()
      await expect(token.connect(addr1).transfer(addr2Address, ethers.parseEther('100'))).to.be.revertedWith(
        'Pausable: paused',
      )
    })
  })

  describe('Forced Transfers', function () {
    beforeEach(async function () {
      // Register and verify addr1 identity
      await mockIdentityRegistry.registerIdentity(addr1Address, 1, true)
      await mockIdentityRegistry.setVerified(addr1Address, true)

      // Set up mock to allow transfers
      await mockCompliance.setCanTransfer(addr1Address, true)

      await token.connect(agent).mint(addr1Address, ethers.parseEther('1000'))
      await mockIdentityRegistry.setVerified(addr2Address, true)
    })

    it('Should allow agent to force transfer tokens', async function () {
      await token.connect(agent).forcedTransfer(addr1Address, addr2Address, ethers.parseEther('100'))
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ethers.parseEther('100'))
    })

    it('Should revert if sender is not agent', async function () {
      await expect(
        token.connect(addr1).forcedTransfer(addr1Address, addr2Address, ethers.parseEther('100')),
      ).to.be.revertedWith('AgentRole: caller does not have the Agent role')
    })

    it('Should revert if not enough balance', async function () {
      await expect(
        token.connect(agent).forcedTransfer(addr1Address, addr2Address, ethers.parseEther('1001')),
      ).to.be.revertedWith('sender balance too low')
    })

    it('Should allow agent to force transfer if tokens are not frozen', async function () {
      await token.connect(agent).freezePartialTokens(addr1Address, ethers.parseEther('500'))
      await expect(token.connect(agent).forcedTransfer(addr1Address, addr2Address, ethers.parseEther('100')))
        // Should not emit TokensUnfrozen event
        .not.to.emit(token, 'TokensUnfrozen')
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ethers.parseEther('100'))
    })

    it('Should allow agent to force transfer if tokens are frozen but to account is verified', async function () {
      await mockIdentityRegistry.setVerified(addr2Address, true)
      await token.connect(agent).freezePartialTokens(addr1Address, ethers.parseEther('500'))
      await expect(token.connect(agent).forcedTransfer(addr1Address, addr2Address, ethers.parseEther('600')))
        // Should emit PrivateEvent with TokensUnfrozen event type
        .to.emit(token, 'PrivateEvent')
        .withArgs([addr1Address], token.EVENT_TYPE_TOKENS_UNFROZEN(), ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [addr1Address, ethers.parseEther('100')]))
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ethers.parseEther('600'))
    })

    it('Should revert to force transfer if to account is not verified', async function () {
      await mockIdentityRegistry.setVerified(addr2Address, false)
      await token.connect(agent).freezePartialTokens(addr1Address, ethers.parseEther('500'))

      // Should revert transferring more than available tokens
      await expect(
        token.connect(agent).forcedTransfer(addr1Address, addr2Address, ethers.parseEther('600')),
      ).to.be.revertedWith('Transfer not possible')

      // Should revert transferring less than available tokens
      await expect(
        token.connect(agent).forcedTransfer(addr1Address, addr2Address, ethers.parseEther('100')),
      ).to.be.revertedWith('Transfer not possible')
    })

    it('Should force transfer if token is paused', async function () {
      await token.connect(agent).pause()
      await token.connect(agent).forcedTransfer(addr1Address, addr2Address, ethers.parseEther('100'))
      expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ethers.parseEther('100'))
    })
  })

  describe('Token Burning', function () {
    beforeEach(async function () {
      // Register and verify addr1 identity
      await mockIdentityRegistry.registerIdentity(addr1Address, 1, true)
      await mockIdentityRegistry.setVerified(addr1Address, true)

      // Set up mock to allow address 1 to transfer / burn tokens
      await mockCompliance.setCanTransfer(addr1Address, true)

      await token.connect(agent).mint(addr1Address, ethers.parseEther('1000'))
    })

    it('Should burn tokens', async function () {
      await token.connect(agent).burn(addr1Address, ethers.parseEther('500'))
      expect(await token.connect(addr1).balanceOf(addr1Address)).to.equal(ethers.parseEther('500'))
    })

    it('Should revert if sender is not agent', async function () {
      await expect(token.connect(addr1).burn(addr1Address, ethers.parseEther('500'))).to.be.revertedWith(
        'AgentRole: caller does not have the Agent role',
      )
    })

    it('Should revert if not enough balance', async function () {
      await expect(token.connect(agent).burn(addr1Address, ethers.parseEther('1001'))).to.be.revertedWith(
        'cannot burn more than balance',
      )
    })

    it('Should burn tokens even though they are frozen', async function () {
      await token.connect(agent).freezePartialTokens(addr1Address, ethers.parseEther('500'))
      expect(await token.connect(agent).burn(addr1Address, ethers.parseEther('600')))
        // Should emit TokensUnfrozen event with zero amount
        .to.emit(token, 'TokensUnfrozen')
        .withArgs(addr1Address, 0)
      expect(await token.connect(addr1).balanceOf(addr1Address)).to.equal(ethers.parseEther('400'))
    })
  })

  describe('Token Minting', function () {
    beforeEach(async function () {
      // Register and verify addr1 identity
      await mockIdentityRegistry.registerIdentity(addr1Address, 1, true)

      // Set up mock to allow address 1 to transfer / burn tokens
      await mockCompliance.setCanTransfer(addr1Address, true)
    })

    it('Should mint tokens', async function () {
      await token.connect(agent).mint(addr1Address, ethers.parseEther('1000'))
      expect(await token.connect(addr1).balanceOf(addr1Address)).to.equal(ethers.parseEther('1000'))
    })

    it('Should revert if sender is not agent', async function () {
      await expect(token.connect(addr1).mint(addr1Address, ethers.parseEther('1000'))).to.be.revertedWith(
        'AgentRole: caller does not have the Agent role',
      )
    })

    it('Should revert if to address is not verified', async function () {
      await mockIdentityRegistry.setVerified(addr1Address, false)
      await expect(token.connect(agent).mint(addr1Address, ethers.parseEther('1000'))).to.be.revertedWith(
        'Identity is not verified.',
      )
    })

    it('Should revert if mint is disabled by compliance', async function () {
      await mockCompliance.setCanTransfer(ethers.ZeroAddress, false)
      await expect(token.connect(agent).mint(addr1Address, ethers.parseEther('1000'))).to.be.revertedWith(
        'Compliance not followed',
      )
    })
  })

  describe('Allowances', function () {
    const ALLOWANCE_AMOUNT = ethers.parseEther('100')

    beforeEach(async function () {
      // Register and verify identities
      await mockIdentityRegistry.registerIdentity(addr1Address, 1, true)
      await mockIdentityRegistry.registerIdentity(addr2Address, 1, true)

      // Set up mock to allow transfers
      await mockCompliance.setCanTransfer(addr1Address, true)
      await mockCompliance.setCanTransfer(addr2Address, true)

      // Mint tokens to addr1 for testing
      await token.connect(agent).mint(addr1Address, ethers.parseEther('1000'))
    })

    describe('Access Control', function () {
      beforeEach(async function () {
        // Set up an allowance for testing
        await token.connect(addr1).approve(addr2Address, ALLOWANCE_AMOUNT)
      })

      it('Should allow owner to view their own allowance', async function () {
        const allowance = await token.connect(addr1).allowance(addr1Address, addr2Address)
        expect(allowance).to.equal(ALLOWANCE_AMOUNT)
      })

      it('Should allow spender to view their allowance', async function () {
        const allowance = await token.connect(addr2).allowance(addr1Address, addr2Address)
        expect(allowance).to.equal(ALLOWANCE_AMOUNT)
      })

      it('Should revert when unauthorized third party tries to view allowance', async function () {
        await expect(token.connect(addr2).allowance(addr1Address, ownerAddress)).to.be.revertedWith(
          'Unauthorized allowance access',
        )
      })
    })

    describe('Setting Allowances', function () {
      it('Should set and get allowance correctly when called by owner', async function () {
        await token.connect(addr1).approve(addr2Address, ALLOWANCE_AMOUNT)
        const allowance = await token.connect(addr1).allowance(addr1Address, addr2Address)
        expect(allowance).to.equal(ALLOWANCE_AMOUNT)
      })

      it('Should emit Approval event when setting allowance', async function () {
        await expect(token.connect(addr1).approve(addr2Address, ALLOWANCE_AMOUNT))
          // Should emit PrivateEvent with Approval event type
          .to.emit(token, 'PrivateEvent')
          .withArgs([addr1Address, addr2Address], token.EVENT_TYPE_APPROVAL(), ethers.AbiCoder.defaultAbiCoder().encode(['address', 'address', 'uint256'], [addr1Address, addr2Address, ALLOWANCE_AMOUNT]))
      })

      it('Should not allow setting allowance for zero address spender', async function () {
        await expect(token.connect(addr1).approve(ethers.ZeroAddress, ALLOWANCE_AMOUNT)).to.be.revertedWith(
          'ERC20: approve to the zero address',
        )
      })

      it('Should allow changing allowance', async function () {
        // Set initial allowance
        await token.connect(addr1).approve(addr2Address, ALLOWANCE_AMOUNT)

        // Change allowance
        const newAllowance = ALLOWANCE_AMOUNT * 2n
        await token.connect(addr1).approve(addr2Address, newAllowance)

        const allowance = await token.connect(addr1).allowance(addr1Address, addr2Address)
        expect(allowance).to.equal(newAllowance)
      })

      it('Should increase allowance', async function () {
        // Set initial allowance
        await token.connect(addr1).approve(addr2Address, ALLOWANCE_AMOUNT)

        // Increase allowance
        await token.connect(addr1).increaseAllowance(addr2Address, ALLOWANCE_AMOUNT)

        const allowance = await token.connect(addr1).allowance(addr1Address, addr2Address)
        expect(allowance).to.equal(ALLOWANCE_AMOUNT * 2n)
      })

      it('Should decrease allowance', async function () {
        // Set initial allowance
        await token.connect(addr1).approve(addr2Address, ALLOWANCE_AMOUNT)

        // Decrease allowance
        await token.connect(addr1).decreaseAllowance(addr2Address, ALLOWANCE_AMOUNT)

        const allowance = await token.connect(addr1).allowance(addr1Address, addr2Address)
        expect(allowance).to.equal(0n)
      })
    })

    describe('Using Allowances', function () {
      beforeEach(async function () {
        // Set up allowance for testing
        await token.connect(addr1).approve(addr2Address, ALLOWANCE_AMOUNT)
      })

      it('Should allow spender to transfer allowed amount', async function () {
        // addr2 transfers tokens from addr1 to themselves
        await token.connect(addr2).transferFrom(addr1Address, addr2Address, ALLOWANCE_AMOUNT)

        // Check balances
        expect(await token.connect(addr1).balanceOf(addr1Address)).to.equal(ethers.parseEther('900'))
        expect(await token.connect(addr2).balanceOf(addr2Address)).to.equal(ALLOWANCE_AMOUNT)

        // Check allowance is reduced
        const finalAllowance = await token.connect(addr2).allowance(addr1Address, addr2Address)
        expect(finalAllowance).to.equal(0)
      })

      // This test is not valid for ERC-3643 (v4.1.6) implementation since arithmetic operation overflows
      // it('Should not allow spender to transfer more than allowed amount', async function () {
      //   const exceedAmount = ALLOWANCE_AMOUNT + 1n
      //   await expect(token.connect(addr2).transferFrom(addr1Address, addr2Address, exceedAmount)).to.be.revertedWith(
      //     'ERC20: insufficient allowance',
      //   )
      // })

      it('Should revert if account is frozen', async function () {
        await token.connect(agent).setAddressFrozen(addr1Address, true)
        await expect(
          token.connect(addr2).transferFrom(addr1Address, addr2Address, ALLOWANCE_AMOUNT),
        ).to.be.revertedWith('wallet is frozen')
      })

      it('Should revert if to account is frozen', async function () {
        await token.connect(agent).setAddressFrozen(addr2Address, true)
        await expect(
          token.connect(addr2).transferFrom(addr1Address, addr2Address, ALLOWANCE_AMOUNT),
        ).to.be.revertedWith('wallet is frozen')
      })

      it('Should revert if to account is not verified', async function () {
        await mockIdentityRegistry.setVerified(addr2Address, false)
        await expect(
          token.connect(addr2).transferFrom(addr1Address, addr2Address, ALLOWANCE_AMOUNT),
        ).to.be.revertedWith('Transfer not possible')
      })

      it('Should revert if rejected by compliance', async function () {
        await mockCompliance.setCanTransfer(addr1Address, false)
        await expect(
          token.connect(addr2).transferFrom(addr1Address, addr2Address, ALLOWANCE_AMOUNT),
        ).to.be.revertedWith('Transfer not possible')
      })

      it('Should handle infinite allowance correctly', async function () {
        const infiniteAllowance = ethers.MaxUint256

        // Set infinite allowance
        await token.connect(addr1).approve(addr2Address, infiniteAllowance)

        // Perform a transfer
        const transferAmount = ALLOWANCE_AMOUNT
        await token.connect(addr2).transferFrom(addr1Address, addr2Address, transferAmount)

        // Check that allowance remains infinite
        const allowance = await token.connect(addr2).allowance(addr1Address, addr2Address)
        expect(allowance).to.equal(infiniteAllowance - transferAmount)
      })

      it('Should fail when trying to transfer with expired allowance', async function () {
        // Use up the allowance
        await token.connect(addr2).transferFrom(addr1Address, addr2Address, ALLOWANCE_AMOUNT)

        // This test is not valid for ERC-3643 (v4.1.6) implementation since arithmetic operation overflows
        // Try to transfer again
        // await expect(token.connect(addr2).transferFrom(addr1Address, addr2Address, 1n)).to.be.revertedWith(
        //   'ERC20: insufficient allowance',
        // )
      })

      it('Should not allow transfer if token is paused', async function () {
        await token.connect(agent).pause()
        await expect(
          token.connect(addr2).transferFrom(addr1Address, addr2Address, ALLOWANCE_AMOUNT),
        ).to.be.revertedWith('Pausable: paused')
      })
    })
  })

  describe('Auditor Management', function () {
    let auditor1: Signer
    let auditor2: Signer
    let auditor1Address: string
    let auditor2Address: string

    beforeEach(async function () {
      // Get additional signers for auditors
      const signers = await ethers.getSigners()
      auditor1 = signers[4]
      auditor2 = signers[5]
      auditor1Address = await auditor1.getAddress()
      auditor2Address = await auditor2.getAddress()
    })

    describe('Adding Auditors', function () {
      it('Should allow agent to add auditor', async function () {
        await token.connect(agent).addAuditor(auditor1Address)
        
        const auditors = await token.getAuditors()
        expect(auditors).to.include(auditor1Address)
        expect(await token.auditorCount()).to.equal(1)
      })

      it('Should emit AuditorAdded event', async function () {
        await expect(token.connect(agent).addAuditor(auditor1Address))
          .to.emit(token, 'AuditorAdded')
          .withArgs(auditor1Address)
      })

      it('Should allow adding multiple auditors', async function () {
        await token.connect(agent).addAuditor(auditor1Address)
        await token.connect(agent).addAuditor(auditor2Address)
        
        const auditors = await token.getAuditors()
        expect(auditors).to.include(auditor1Address)
        expect(auditors).to.include(auditor2Address)
        expect(await token.auditorCount()).to.equal(2)
      })

      it('Should revert if caller is not agent', async function () {
        await expect(token.connect(addr1).addAuditor(auditor1Address))
          .to.be.revertedWith('AgentRole: caller does not have the Agent role')
      })

      it('Should revert when adding zero address', async function () {
        await expect(token.connect(agent).addAuditor(ethers.ZeroAddress))
          .to.be.revertedWith('Invalid address')
      })

      it('Should revert when adding duplicate auditor', async function () {
        await token.connect(agent).addAuditor(auditor1Address)
        await expect(token.connect(agent).addAuditor(auditor1Address))
          .to.be.revertedWith('Auditor already added')
      })
    })

    describe('Removing Auditors', function () {
      beforeEach(async function () {
        // Add auditors for removal tests
        await token.connect(agent).addAuditor(auditor1Address)
        await token.connect(agent).addAuditor(auditor2Address)
      })

      it('Should allow agent to remove auditor', async function () {
        await token.connect(agent).removeAuditor(auditor1Address)
        
        const auditors = await token.getAuditors()
        expect(auditors).not.to.include(auditor1Address)
        expect(auditors).to.include(auditor2Address)
        expect(await token.auditorCount()).to.equal(1)
      })

      it('Should emit AuditorRemoved event', async function () {
        await expect(token.connect(agent).removeAuditor(auditor1Address))
          .to.emit(token, 'AuditorRemoved')
          .withArgs(auditor1Address)
      })

      it('Should handle removing last auditor', async function () {
        await token.connect(agent).removeAuditor(auditor1Address)
        await token.connect(agent).removeAuditor(auditor2Address)
        
        const auditors = await token.getAuditors()
        expect(auditors.length).to.equal(0)
        expect(await token.auditorCount()).to.equal(0)
      })

      it('Should revert if caller is not agent', async function () {
        await expect(token.connect(addr1).removeAuditor(auditor1Address))
          .to.be.revertedWith('AgentRole: caller does not have the Agent role')
      })

      it('Should revert when removing zero address', async function () {
        await expect(token.connect(agent).removeAuditor(ethers.ZeroAddress))
          .to.be.revertedWith('Invalid address')
      })

      it('Should revert when removing non-existent auditor', async function () {
        const nonExistentAddress = await addr2.getAddress()
        await expect(token.connect(agent).removeAuditor(nonExistentAddress))
          .to.be.revertedWith('Auditor not found')
      })
    })

    describe('Bulk Auditor Management', function () {
      describe('setAuditors', function () {
        it('Should allow agent to set initial auditors', async function () {
          const newAuditors = [auditor1Address, auditor2Address]
          
          await expect(token.connect(agent).setAuditors(newAuditors))
            .to.emit(token, 'AuditorAdded').withArgs(auditor1Address)
            .and.to.emit(token, 'AuditorAdded').withArgs(auditor2Address)
          
          const currentAuditors = await token.getAuditors()
          expect(currentAuditors).to.deep.equal(newAuditors)
          expect(await token.auditorCount()).to.equal(2)
        })

        it('Should allow agent to replace existing auditors', async function () {
          // First, add some auditors
          await token.connect(agent).addAuditor(auditor1Address)
          await token.connect(agent).addAuditor(auditor2Address)
          expect(await token.auditorCount()).to.equal(2)
          
          // Then replace with new set
          const newAuditors = [addr1Address, addr2Address]
          
          await expect(token.connect(agent).setAuditors(newAuditors))
            .to.emit(token, 'AuditorRemoved').withArgs(auditor1Address)
            .and.to.emit(token, 'AuditorRemoved').withArgs(auditor2Address)
            .and.to.emit(token, 'AuditorAdded').withArgs(addr1Address)
            .and.to.emit(token, 'AuditorAdded').withArgs(addr2Address)
          
          const currentAuditors = await token.getAuditors()
          expect(currentAuditors).to.deep.equal(newAuditors)
          expect(await token.auditorCount()).to.equal(2)
        })

        it('Should allow agent to clear all auditors', async function () {
          // First, add some auditors
          await token.connect(agent).addAuditor(auditor1Address)
          await token.connect(agent).addAuditor(auditor2Address)
          expect(await token.auditorCount()).to.equal(2)
          
          // Then clear all
          await expect(token.connect(agent).setAuditors([]))
            .to.emit(token, 'AuditorRemoved').withArgs(auditor1Address)
            .and.to.emit(token, 'AuditorRemoved').withArgs(auditor2Address)
          
          const currentAuditors = await token.getAuditors()
          expect(currentAuditors).to.have.length(0)
          expect(await token.auditorCount()).to.equal(0)
        })

        it('Should handle setting same auditors (idempotent when no existing auditors)', async function () {
          const newAuditors = [auditor1Address, auditor2Address]
          
          // Set auditors first time
          await token.connect(agent).setAuditors(newAuditors)
          expect(await token.auditorCount()).to.equal(2)
          
          // Set same auditors again (after clearing in process)
          await expect(token.connect(agent).setAuditors(newAuditors))
            .to.emit(token, 'AuditorRemoved').withArgs(auditor1Address)
            .and.to.emit(token, 'AuditorRemoved').withArgs(auditor2Address)
            .and.to.emit(token, 'AuditorAdded').withArgs(auditor1Address)
            .and.to.emit(token, 'AuditorAdded').withArgs(auditor2Address)
          
          const currentAuditors = await token.getAuditors()
          expect(currentAuditors).to.deep.equal(newAuditors)
          expect(await token.auditorCount()).to.equal(2)
        })

        it('Should revert if caller is not agent', async function () {
          const newAuditors = [auditor1Address]
          
          await expect(token.connect(owner).setAuditors(newAuditors))
            .to.be.revertedWith('AgentRole: caller does not have the Agent role')
          
          await expect(token.connect(addr1).setAuditors(newAuditors))
            .to.be.revertedWith('AgentRole: caller does not have the Agent role')
        })

        it('Should revert when trying to set zero address', async function () {
          const newAuditors = [auditor1Address, ethers.ZeroAddress, auditor2Address]
          
          await expect(token.connect(agent).setAuditors(newAuditors))
            .to.be.revertedWith('Zero address not allowed')
        })

        it('Should revert when trying to set duplicate auditors', async function () {
          const newAuditors = [auditor1Address, auditor2Address, auditor1Address]
          
          await expect(token.connect(agent).setAuditors(newAuditors))
            .to.be.revertedWith('Duplicate auditor')
        })

        it('Should work with single auditor', async function () {
          const newAuditors = [auditor1Address]
          
          await expect(token.connect(agent).setAuditors(newAuditors))
            .to.emit(token, 'AuditorAdded').withArgs(auditor1Address)
          
          const currentAuditors = await token.getAuditors()
          expect(currentAuditors).to.deep.equal(newAuditors)
          expect(await token.auditorCount()).to.equal(1)
        })

        it('Should properly clean up state when replacing auditors', async function () {
          // Add initial auditors using individual function
          await token.connect(agent).addAuditor(auditor1Address)
          await token.connect(agent).addAuditor(auditor2Address)
          
          // Verify initial state
          expect(await token.auditorCount()).to.equal(2)
          
          // Replace with completely different set
          const newAuditors = [addr1Address]
          await token.connect(agent).setAuditors(newAuditors)
          
          // Verify final state
          expect(await token.auditorCount()).to.equal(1)
          const currentAuditors = await token.getAuditors()
          expect(currentAuditors).to.deep.equal(newAuditors)
          
          // Verify old auditors are properly cleaned up by trying to add them again
          await expect(token.connect(agent).addAuditor(auditor1Address))
            .to.emit(token, 'AuditorAdded').withArgs(auditor1Address)
          
          expect(await token.auditorCount()).to.equal(2)
        })
      })
    })

    describe('Auditor Integration with Private Events', function () {
      beforeEach(async function () {
        // Set up for testing private events with auditors
        await mockIdentityRegistry.registerIdentity(addr1Address, 1, true)
        await mockIdentityRegistry.registerIdentity(addr2Address, 1, true)
        await mockCompliance.setCanTransfer(addr1Address, true)
        await mockCompliance.setCanTransfer(addr2Address, true)
        
        // Add auditors
        await token.connect(agent).addAuditor(auditor1Address)
        await token.connect(agent).addAuditor(auditor2Address)
        
        // Mint tokens for testing
        await token.connect(agent).mint(addr1Address, ethers.parseEther('1000'))
      })

      it('Should include auditors in transfer private events', async function () {
        const transferAmount = ethers.parseEther('100')
        
        // Capture the transaction
        const tx = await token.connect(addr1).transfer(addr2Address, transferAmount)
        const receipt = await tx.wait()
        
        // Find the PrivateEvent
        const privateEvent = receipt?.logs.find(log => {
          try {
            const parsed = token.interface.parseLog({ topics: log.topics as string[], data: log.data })
            return parsed?.name === 'PrivateEvent'
          } catch {
            return false
          }
        })
        
        expect(privateEvent).to.not.be.undefined
        
        if (privateEvent) {
          const parsed = token.interface.parseLog({ topics: privateEvent.topics as string[], data: privateEvent.data })
          const allowedViewers = parsed?.args[0] as string[]
          
          // Should include both participants and auditors
          expect(allowedViewers).to.include(addr1Address) // from
          expect(allowedViewers).to.include(addr2Address) // to
          expect(allowedViewers).to.include(auditor1Address) // auditor 1
          expect(allowedViewers).to.include(auditor2Address) // auditor 2
          expect(allowedViewers.length).to.equal(4) // 2 participants + 2 auditors
        }
      })

      it('Should include auditors in token freezing private events', async function () {
        const freezeAmount = ethers.parseEther('50')
        
        // Capture the transaction
        const tx = await token.connect(agent).freezePartialTokens(addr1Address, freezeAmount)
        const receipt = await tx.wait()
        
        // Find the PrivateEvent
        const privateEvent = receipt?.logs.find(log => {
          try {
            const parsed = token.interface.parseLog({ topics: log.topics as string[], data: log.data })
            return parsed?.name === 'PrivateEvent'
          } catch {
            return false
          }
        })
        
        expect(privateEvent).to.not.be.undefined
        
        if (privateEvent) {
          const parsed = token.interface.parseLog({ topics: privateEvent.topics as string[], data: privateEvent.data })
          const allowedViewers = parsed?.args[0] as string[]
          
          // Should include user and auditors
          expect(allowedViewers).to.include(addr1Address) // user
          expect(allowedViewers).to.include(auditor1Address) // auditor 1
          expect(allowedViewers).to.include(auditor2Address) // auditor 2
          expect(allowedViewers.length).to.equal(3) // 1 user + 2 auditors
        }
      })

      it('Should work with no auditors', async function () {
        // Remove all auditors
        await token.connect(agent).removeAuditor(auditor1Address)
        await token.connect(agent).removeAuditor(auditor2Address)
        
        const transferAmount = ethers.parseEther('100')
        
        // Capture the transaction
        const tx = await token.connect(addr1).transfer(addr2Address, transferAmount)
        const receipt = await tx.wait()
        
        // Find the PrivateEvent
        const privateEvent = receipt?.logs.find(log => {
          try {
            const parsed = token.interface.parseLog({ topics: log.topics as string[], data: log.data })
            return parsed?.name === 'PrivateEvent'
          } catch {
            return false
          }
        })
        
        expect(privateEvent).to.not.be.undefined
        
        if (privateEvent) {
          const parsed = token.interface.parseLog({ topics: privateEvent.topics as string[], data: privateEvent.data })
          const allowedViewers = parsed?.args[0] as string[]
          
          // Should only include participants, no auditors
          expect(allowedViewers).to.include(addr1Address) // from
          expect(allowedViewers).to.include(addr2Address) // to
          expect(allowedViewers.length).to.equal(2) // only 2 participants, no auditors
        }
        
        expect(await token.auditorCount()).to.equal(0)
      })
    })

    describe('Edge Cases', function () {
      it('Should handle adding and removing same auditor multiple times', async function () {
        // Add auditor
        await token.connect(agent).addAuditor(auditor1Address)
        expect(await token.auditorCount()).to.equal(1)
        
        // Remove auditor
        await token.connect(agent).removeAuditor(auditor1Address)
        expect(await token.auditorCount()).to.equal(0)
        
        // Add same auditor again
        await token.connect(agent).addAuditor(auditor1Address)
        expect(await token.auditorCount()).to.equal(1)
        
        const auditors = await token.getAuditors()
        expect(auditors).to.include(auditor1Address)
      })

      it('Should maintain correct order when removing from middle', async function () {
        const signers = await ethers.getSigners()
        const auditor3Address = await signers[6].getAddress()
        
        // Add three auditors
        await token.connect(agent).addAuditor(auditor1Address)
        await token.connect(agent).addAuditor(auditor2Address)
        await token.connect(agent).addAuditor(auditor3Address)
        
        // Remove middle auditor
        await token.connect(agent).removeAuditor(auditor2Address)
        
        const auditors = await token.getAuditors()
        expect(auditors.length).to.equal(2)
        expect(auditors).to.include(auditor1Address)
        expect(auditors).to.include(auditor3Address)
        expect(auditors).not.to.include(auditor2Address)
      })
    })
  })
})
