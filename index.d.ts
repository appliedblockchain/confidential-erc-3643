export { UCEF3643 } from './typechain-types'
export { Identity, Token, ClaimIssuer } from './typechain-types'

export type Abi = any[];
export interface Artifact<AbiT extends Abi = Abi> {
    contractName: string;
    sourceName: string;
    bytecode: string;
    abi: AbiT;
    linkReferences: Record<string, Record<string, Array<{
        length: number;
        start: number;
    }>>>;
}

export namespace UCEF3643Contracts {
  export const UCEF3643: Artifact
}
