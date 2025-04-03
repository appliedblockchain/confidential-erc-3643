/**
 * @title TREX Deploy Full Suite Fixture
 * @dev Script imported and adapted from TokenySolutions/T-REX GitHub repository
 * https://github.com/TokenySolutions/T-REX/blob/main/test/fixtures/deploy-full-suite.fixture.ts
 */

import { ethers } from 'hardhat'
import pc from 'picocolors'
import { ImportedSuite, importSuite, createRandomWallet, Signers } from '../utils'
import { deployBasicSuite } from './deploy-basic-suite'
import { deployClaimIssuer } from './deploy-claim-issuer'
import { deployIdentities } from './deploy-identities'

async function getSigners(): Promise<Signers> {
  const [
    deployer,
    tokenIssuer,
    tokenAgent,
    tokenAdmin,
    claimIssuer,
    aliceWallet,
    bobWallet,
    charlieWallet,
    davidWallet,
    anotherWallet,
  ] = await ethers.getSigners()

  return {
    deployer: deployer || createRandomWallet(),
    tokenIssuer: tokenIssuer || createRandomWallet(),
    tokenAgent: tokenAgent || createRandomWallet(),
    tokenAdmin: tokenAdmin || createRandomWallet(),
    claimIssuer: claimIssuer || createRandomWallet(),
    aliceWallet: aliceWallet || createRandomWallet(),
    bobWallet: bobWallet || createRandomWallet(),
    charlieWallet: charlieWallet || createRandomWallet(),
    davidWallet: davidWallet || createRandomWallet(),
    anotherWallet: anotherWallet || createRandomWallet(),
  }
}

export async function main({
  suiteFilePath,
  skipClaimIssuer,
  skipIdentities,
}: {
  suiteFilePath?: string
  skipClaimIssuer?: boolean
  skipIdentities?: boolean
} = {}) {
  let suite: ImportedSuite

  if (suiteFilePath) {
    console.log(pc.green('Importing suite from file...'))
    suite = await importSuite(suiteFilePath)
  } else {
    console.log(pc.green('Deploying full suite fixture...'))
    console.log(pc.yellow('1/15 Getting signers...'))
    const signers = await getSigners()
    suite = (await deployBasicSuite(signers)) as unknown as ImportedSuite
  }

  !skipClaimIssuer && (await deployClaimIssuer(suite))
  !skipIdentities && (await deployIdentities(suite))

  return suite
}
