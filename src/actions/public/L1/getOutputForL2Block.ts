import { ActionBaseType } from '../../../types/actions'
import { OpStackL1Contracts } from '../../../types/opStackContracts'
import { ContractToChainAddressMapping } from '../../wallet/L1/writeUnsafeDepositTransaction'
import { l2OutputOracleABI } from '@eth-optimism/contracts-ts'
import { Chain, Hex, PublicClient, Transport } from 'viem'
import { readContract } from 'viem/actions'

export type Proposal = {
  outputRoot: Hex
  timestamp: bigint
  l2BlockNumber: bigint
}

export type GetOutputForL2BlockParameters<
  TChain extends Chain | undefined = Chain,
  _contractName extends OpStackL1Contracts = OpStackL1Contracts.optimismL2OutputOracle,
> = { l2BlockNumber: bigint } & ActionBaseType<
  TChain,
  TChain,
  _contractName,
  TChain
>

export type GetOutputForL2BlockReturnType = {
  proposal: Proposal
  outputIndex: bigint
}

/**
 * Calls to the L2OutputOracle contract on L1 to get the output for a given L2 block
 *
 * @param {bigint} blockNumber the L2 block number to get the output for
 * @param {OpChainL2} rollup the L2 chain
 * @returns {GetOutputForL2BlockReturnType} Output proposal and index for the L2 block
 */
export async function getOutputForL2Block<TChain extends Chain | undefined>(
  client: PublicClient<Transport, TChain>,
  {
    l2BlockNumber,
    l2ChainId,
    optimismL2OutputOracleAddress,
    chain = client.chain,
  }: GetOutputForL2BlockParameters<TChain>,
): Promise<GetOutputForL2BlockReturnType> {
  const contracts = chain?.contracts as
    | ContractToChainAddressMapping
    | undefined
  const oracle =
    optimismL2OutputOracleAddress ||
    (contracts && typeof l2ChainId === 'number'
      ? contracts[OpStackL1Contracts.optimismL2OutputOracle][l2ChainId]
      : undefined)
  if (!oracle) {
    throw new Error('oracle not defined')
  }
  const outputIndex = await readContract(client, {
    // TODO fix types here
    address: oracle,
    abi: l2OutputOracleABI,
    functionName: 'getL2OutputIndexAfter',
    args: [l2BlockNumber],
  })

  const proposal = await readContract(client, {
    address: oracle,
    abi: l2OutputOracleABI,
    functionName: 'getL2Output',
    args: [outputIndex],
  })

  return { proposal, outputIndex }
}
