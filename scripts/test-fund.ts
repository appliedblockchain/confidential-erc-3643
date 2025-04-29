import { ethers } from 'hardhat'
import { fundAccount } from './utils/fund'
;(async () => {
  const address = process.env.ADDRESS

  if (!address) {
    console.error('ADDRESS is not set')
    return
  }

  console.log('Address:', address)
  const balance = await ethers.provider.getBalance(address)
  console.log('Initial balance:', ethers.formatEther(balance), 'ETH')

  await fundAccount(address)

  const newBalance = await ethers.provider.getBalance(address)
  console.log('New balance:', ethers.formatEther(newBalance), 'ETH')
})()
