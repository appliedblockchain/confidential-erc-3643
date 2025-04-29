import TREX from '@tokenysolutions/t-rex'
import { SilentDataRollupContract } from '@appliedblockchain/silentdatarollup-core'
import { createWallet } from './utils'
;(async () => {
  const aliceWallet = createWallet(process.env.ALICE_ACCOUNT!)
  const bobWallet = createWallet(process.env.BOB_ACCOUNT!)

  console.log('Alice wallet:', aliceWallet.address)
  console.log('Bob wallet:', bobWallet.address)

  console.log('\nToken address:', process.env.TOKEN_CONTRACT!)

  const aliceToken = new SilentDataRollupContract({
    address: process.env.TOKEN_CONTRACT!,
    abi: TREX.contracts.Token.abi,
    runner: aliceWallet as any,
    contractMethodsToSign: ['balanceOf'],
  })

  const bobToken = new SilentDataRollupContract({
    address: process.env.TOKEN_CONTRACT!,
    abi: TREX.contracts.Token.abi,
    runner: bobWallet as any,
    contractMethodsToSign: ['balanceOf'],
  })

  console.log('Alice token balance:', Number(await aliceToken.balanceOf(aliceWallet.address)))
  console.log('Bob token balance:', Number(await bobToken.balanceOf(bobWallet.address)))

  console.log('\nTransferring 1 token...')
  const tx = await aliceToken.transfer(bobWallet.address, 1n)
  console.log('Transfer Tx:', tx.hash)
  await tx.wait()

  const aliceTokenBalanceAfter = await aliceToken.balanceOf(aliceWallet.address)
  console.log('\nAlice token balance after:', Number(aliceTokenBalanceAfter))
  const bobTokenBalanceAfter = await bobToken.balanceOf(bobWallet.address)
  console.log('Bob token balance after:', Number(bobTokenBalanceAfter))

  // Check privacy
  console.log('\nChecking privacy...')
  try {
    await bobToken.balanceOf(aliceWallet.address)
    console.log('Bob could see Alice balance!')
  } catch (error) {
    console.log('Bob does not see Alice balance!')
  }

  try {
    await aliceToken.balanceOf(bobWallet.address)
    console.log('Alice could see Bob balance!')
  } catch (error) {
    console.log('Alice does not see Bob balance!')
  }
})()
