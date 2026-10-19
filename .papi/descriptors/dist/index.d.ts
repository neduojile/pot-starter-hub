import { default as portaldotV3, type PortaldotV3WhitelistEntry } from "./portaldotV3";
export { portaldotV3 };
export type * from "./portaldotV3";
export { DigestItem, Phase, DispatchClass, TokenError, ArithmeticError, TransactionalError, BalanceStatus, PreimagePalletHoldReason, TransactionPaymentEvent, ElectionProviderMultiPhaseEvent, ElectionProviderMultiPhaseElectionCompute, ElectionProviderMultiPhasePhase, StakingRewardDestination, StakingForcing, GrandpaEvent, PreimageEvent, BagsListEvent, ChildBountiesEvent, NominationPoolsPoolState, NominationPoolsCommissionClaimPermission, NominationPoolsClaimPermission, BrokerCoretimeInterfaceCoreAssignment, ReferendaTypesCurve, BabeDigestsNextConfigDescriptor, BabeAllowedSlots, BabeDigestsPreDigest, BalancesTypesReasons, NominationPoolsPalletFreezeReason, TransactionPaymentReleases, BalancesAdjustmentDirection, StakingPalletConfigOpBig, StakingPalletConfigOp, GrandpaEquivocation, IdentityData, IdentityJudgement, NominationPoolsBondExtra, NominationPoolsConfigOp, ExtensionsCheckMortality, GrandpaStoredState, Version, PreimagesBounded, PreimageOldRequestStatus, PreimageRequestStatus, ChildBountyStatus, TransactionValidityUnknownTransaction, TransactionValidityTransactionSource, MmrPrimitivesError } from './common-types';
export declare const getMetadata: (codeHash: string) => Promise<Uint8Array | null>;
export type WhitelistEntry = PortaldotV3WhitelistEntry;
export type WhitelistEntriesByChain = Partial<{
    "*": WhitelistEntry[];
    portaldotV3: WhitelistEntry[];
}>;
