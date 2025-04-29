import { ethers } from 'hardhat'
import pc from 'picocolors'
import { ImportedSuite, deployIdentityProxy, waitTx, ExtendedAccounts } from '../utils'
import { fundAccount } from '../utils/fund'

export async function deployIdentities(data: ImportedSuite) {
  console.log(pc.green('Deploying identities and claims...'))
  const { token, identityRegistry, claimIssuerContract } = data.suite
  const { identityImplementationAuthority } = data.authorities
  const { deployer, aliceWallet, bobWallet, charlieWallet, tokenAgent } = data.accounts as ExtendedAccounts
  const claimTopics = [ethers.id('CLAIM_TOPIC')]

  const aliceActionKey = ethers.Wallet.createRandom()
  data.accounts.aliceActionKey = aliceActionKey
  const claimIssuerSigningKey = data.accounts.claimIssuerSigningKey || ethers.Wallet.createRandom()

  const identityImplementationAuthorityAddress = await identityImplementationAuthority.getAddress()

  console.log(pc.yellow('10/15 Deploying Identities...'))
  const aliceIdentity = await deployIdentityProxy(
    identityImplementationAuthorityAddress,
    await aliceWallet.getAddress(),
    deployer,
  )

  await fundAccount(await aliceWallet.getAddress())

  await waitTx(
    await aliceIdentity
      .connect(aliceWallet)
      .addKey(ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address'], [aliceActionKey.address])), 2, 1),
  )
  const aliceIdentityAddress = await aliceIdentity.getAddress()

  const bobIdentity = await deployIdentityProxy(
    identityImplementationAuthorityAddress,
    await bobWallet.getAddress(),
    deployer,
  )
  const bobIdentityAddress = await bobIdentity.getAddress()

  const charlieIdentity = await deployIdentityProxy(
    identityImplementationAuthorityAddress,
    await charlieWallet.getAddress(),
    deployer,
  )

  await waitTx(await identityRegistry.connect(deployer).addAgent(await tokenAgent.getAddress()))
  await waitTx(await identityRegistry.connect(deployer).addAgent(await token.getAddress()))

  console.log(pc.yellow('11/15 Batch Registering Identities...'))
  await fundAccount(await tokenAgent.getAddress())
  await waitTx(
    await identityRegistry
      .connect(tokenAgent)
      .batchRegisterIdentity(
        [await aliceWallet.getAddress(), await bobWallet.getAddress()],
        [aliceIdentityAddress, bobIdentityAddress],
        [42, 666],
      ),
  )

  console.log(pc.yellow('12/15 Adding Claim for Alice...'))
  const claimForAlice = {
    data: ethers.hexlify(ethers.toUtf8Bytes('Some claim public data.')),
    issuer: await claimIssuerContract!.getAddress(),
    topic: claimTopics[0],
    scheme: 1,
    identity: aliceIdentityAddress,
    signature: '',
  }
  claimForAlice.signature = await claimIssuerSigningKey.signMessage(
    ethers.getBytes(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'bytes'],
          [claimForAlice.identity, claimForAlice.topic, claimForAlice.data],
        ),
      ),
    ),
  )

  await waitTx(
    await aliceIdentity
      .connect(aliceWallet)
      .addClaim(
        claimForAlice.topic,
        claimForAlice.scheme,
        claimForAlice.issuer,
        claimForAlice.signature,
        claimForAlice.data,
        '',
      ),
  )

  console.log(pc.yellow('13/15 Adding Claim for Bob...'))
  const claimForBob = {
    data: ethers.hexlify(ethers.toUtf8Bytes('Some claim public data.')),
    issuer: await claimIssuerContract!.getAddress(),
    topic: claimTopics[0],
    scheme: 1,
    identity: bobIdentityAddress,
    signature: '',
  }
  claimForBob.signature = await claimIssuerSigningKey.signMessage(
    ethers.getBytes(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'bytes'],
          [claimForBob.identity, claimForBob.topic, claimForBob.data],
        ),
      ),
    ),
  )

  await fundAccount(await bobWallet.getAddress())
  await waitTx(
    await bobIdentity
      .connect(bobWallet)
      .addClaim(claimForBob.topic, claimForBob.scheme, claimForBob.issuer, claimForBob.signature, claimForBob.data, ''),
  )

  console.log(pc.yellow('14/15 Minting tokens...'))
  await waitTx(await token.connect(tokenAgent).mint(await aliceWallet.getAddress(), 1000))
  await waitTx(await token.connect(tokenAgent).mint(await bobWallet.getAddress(), 500))

  console.log(pc.yellow('15/15 Unpausing token...'))
  await waitTx(await token.connect(tokenAgent).unpause())

  data.identities = {
    aliceIdentity,
    bobIdentity,
    charlieIdentity,
  }

  console.log(pc.green('Claim issuer, identities and claims deployed successfully!'))

  return data
}
