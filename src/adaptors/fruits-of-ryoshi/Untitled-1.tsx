/* IMPORT NODE MODULES
================================================== */
import { BigNumber, ethers } from 'ethers';
import { useContext, useEffect, useState } from 'react';
import { ThemeContext } from 'styled-components';

/* IMPORT COMPONENTS AND STYLES
================================================== */

/* IMPORT CONSTANTS AND UTILS
================================================== */
import { formatEther } from 'ethers/lib/utils';
import bigDecimal from 'js-big-decimal';
import { AppContext } from '../../../../App';
import { FarmEntry, TOKENS } from '../../../../constants';
import {
  balanceOfStaking,
  earned, getAllowance,
  getCoinGeckoPrice,
  getStakingPoolInfo,
  totalSupply,
  uniswapPrice
} from '../../../../utils';
import { getLpUnderlying } from '../../../../utils/getLpUnderlying';
import { SUPPORTED_CHAIN_ID } from './chainInfo';

/* ENUMS
================================================== */
export enum TOKEN_ID {
  WWDOGECOIN_DOGECHAIN = 1,
  YUZU_DOGECHAIN = 2,
  NONI_DOGECHAIN = 3,
}

/* TYPES
================================================== */
export interface TokenEntry {
  readonly name: string;
  readonly label: string;
  readonly ticker: string;
  readonly chainId: SUPPORTED_CHAIN_ID;
  readonly tokenAddress: string;
  readonly decimals: number;
  readonly underlying?: Array<string>;
}

/* TOKEN INFORMATION
================================================== */
export const TOKENS: Record<string, TokenEntry> = {
  WWDOGECOIN_DOGECHAIN: {
    name: 'wwdogecoin',
    label: 'wwDogecoin',
    ticker: 'wwDOGE',
    chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
    tokenAddress: '0xB7ddC6414bf4F5515b52D8BdD69973Ae205ff101',
    decimals: 18,
  },
  YUZU_DOGECHAIN: {
    name: 'yuzu',
    label: 'Yuzu',
    ticker: 'YUZU',
    chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
    tokenAddress: '0xa98fa09D0BED62A9e0Fb2E58635b7C9274160dc7',
    decimals: 18,
  },
  NONI_DOGECHAIN: {
    name: 'noni',
    label: 'NONI',
    ticker: 'NONI',
    chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
    tokenAddress: '0xa4F9877A08F7639df15D506eAFF92Ab5E78273cd',
    decimals: 18,
  },
  YUZULP_DOGECHAIN: {
    name: 'yuzu lp',
    label: 'Yuzu LP',
    ticker: 'YUZU/wwDOGE',
    chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
    tokenAddress: '0xF553Fa1D10C8060EEf81b350E92856aa4F5e90dA',
    decimals: 18,
    underlying: [
      '0xa98fa09D0BED62A9e0Fb2E58635b7C9274160dc7',
      '0xB7ddC6414bf4F5515b52D8BdD69973Ae205ff101',
    ],
  },
  NONILP_DOGECHAIN: {
    name: 'noni lp',
    label: 'Noni LP',
    ticker: 'NONI/wwDOGE',
    chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
    tokenAddress: '0x4FEDc8EeD1Dae59C8eFc2507033958f799a2084C',
    decimals: 18,
    underlying: [
      '0xa4F9877A08F7639df15D506eAFF92Ab5E78273cd',
      '0xB7ddC6414bf4F5515b52D8BdD69973Ae205ff101',
    ],
  },
};

export const getTokenDetails = (tokenId: TOKEN_ID | string): TokenEntry => {
  if (!(tokenId in TOKENS)) throw new Error('Token is not supported');
  return TOKENS[tokenId];
};
/* IMPORT CONSTANTS AND UTILS
================================================== */
import { TokenEntry, TOKEN_ID } from './tokenInfo';

/* ENUMS
================================================== */
export enum FARM_ID {
  // Test farms
  // YUZU_YUZU = 1,
  // DOGE_YUZU = 2,
  // YUZULP_YUZU = 3,

  // Prod farms
  YUZULP_NONI = 1,
  NONILP_NONI = 2,
  YUZU_NONI = 3,
  NONI_NONI = 4,
  DOGE_NONI = 5,
}

/* TYPES
================================================== */

export interface FarmEntry {
  readonly name: string;
  readonly label: string;
  readonly earn: string;
  readonly chainId: SUPPORTED_CHAIN_ID;
  readonly stakingContract: string;
  readonly stakingToken: string;
  readonly rewardToken: string;
  readonly stakingPoolId: number;
  readonly lpInfo: TokenEntry;
  readonly lpUrl: string;
  readonly isLpToken: boolean;
  readonly comingSoon?: boolean;
}

/* FARM INFORMATION
================================================== */
export const FARMS: Record<string, FarmEntry> = {
  // [FARM_ID.YUZU_YUZU]: {
  //   name: 'yuzu',
  //   label: 'YUZU',
  //   earn: 'YUZU',
  //   chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
  //   stakingContract: '0x206949295503c4FC5C9757099db479dD5383A5dC',
  //   stakingToken: TOKENS.YUZU_DOGECHAIN.tokenAddress,
  //   rewardToken: TOKENS.YUZU_DOGECHAIN.tokenAddress,
  //   stakingPoolId: FARM_ID.YUZU_YUZU,
  //   lpInfo: TOKENS.YUZULP_DOGECHAIN,
  //   isLpToken: false,
  //   lpUrl: `https://dogeswap.org/#/swap?outputCurrency=${TOKENS.YUZU_DOGECHAIN.tokenAddress}`,
  // },
  // [FARM_ID.DOGE_YUZU]: {
  //   name: 'doge',
  //   label: 'wwDOGE',
  //   earn: 'YUZU',
  //   chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
  //   stakingContract: '0x206949295503c4FC5C9757099db479dD5383A5dC',
  //   stakingToken: TOKENS.WWDOGECOIN_DOGECHAIN.tokenAddress,
  //   rewardToken: TOKENS.YUZU_DOGECHAIN.tokenAddress,
  //   stakingPoolId: FARM_ID.DOGE_YUZU,
  //   lpInfo: TOKENS.YUZULP_DOGECHAIN,
  //   isLpToken: false,
  //   lpUrl: `https://dogeswap.org/#/swap?outputCurrency=${TOKENS.WWDOGECOIN_DOGECHAIN.tokenAddress}`,
  // },
  // [FARM_ID.YUZULP_YUZU]: {
  //   name: 'yuzu_doge',
  //   label: 'YUZU/DOGE LP',
  //   earn: 'YUZU',
  //   chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
  //   stakingContract: '0x206949295503c4FC5C9757099db479dD5383A5dC',
  //   stakingToken: TOKENS.YUZULP_DOGECHAIN.tokenAddress,
  //   rewardToken: TOKENS.YUZU_DOGECHAIN.tokenAddress,
  //   stakingPoolId: FARM_ID.YUZULP_YUZU,
  //   lpInfo: TOKENS.YUZULP_DOGECHAIN,
  //   isLpToken: true,
  //   lpUrl: 'https://dogeswap.org/#/pool',
  // },

  [FARM_ID.YUZULP_NONI]: {
    name: 'yuzu_doge',
    label: 'YUZU/DOGE LP',
    earn: 'NONI',
    chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
    stakingContract: '0x206949295503c4FC5C9757099db479dD5383A5dC',
    stakingPoolId: FARM_ID.YUZULP_NONI,
    stakingToken: TOKENS.YUZULP_DOGECHAIN.tokenAddress,
    rewardToken: TOKENS.NONI_DOGECHAIN.tokenAddress,
    lpInfo: TOKENS.YUZULP_DOGECHAIN,
    isLpToken: true,
    lpUrl: `https://dogeswap.org/#/add/WDOGE/${TOKENS.YUZU_DOGECHAIN.tokenAddress}`,
  },
  [FARM_ID.NONILP_NONI]: {
    name: 'noni_doge',
    label: 'NONI/DOGE LP',
    earn: 'NONI',
    chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
    stakingContract: '0x206949295503c4FC5C9757099db479dD5383A5dC',
    stakingPoolId: FARM_ID.NONILP_NONI,
    stakingToken: TOKENS.NONILP_DOGECHAIN.tokenAddress,
    rewardToken: TOKENS.NONI_DOGECHAIN.tokenAddress,
    lpInfo: TOKENS.NONILP_DOGECHAIN,
    isLpToken: true,
    lpUrl: `https://dogeswap.org/#/add/WDOGE/${TOKENS.NONI_DOGECHAIN.tokenAddress}`,
  },
  [FARM_ID.YUZU_NONI]: {
    name: 'yuzu',
    label: 'YUZU',
    earn: 'NONI',
    chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
    stakingContract: '0x206949295503c4FC5C9757099db479dD5383A5dC',
    stakingPoolId: FARM_ID.YUZU_NONI,
    stakingToken: TOKENS.YUZU_DOGECHAIN.tokenAddress,
    rewardToken: TOKENS.NONI_DOGECHAIN.tokenAddress,
    lpInfo: TOKENS.YUZULP_DOGECHAIN,
    isLpToken: false,
    lpUrl: `https://dogeswap.org/#/swap?outputCurrency=${TOKENS.YUZU_DOGECHAIN.tokenAddress}`,
  },
  [FARM_ID.NONI_NONI]: {
    name: 'noni',
    label: 'NONI',
    earn: 'NONI',
    chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
    stakingContract: '0x206949295503c4FC5C9757099db479dD5383A5dC',
    stakingPoolId: FARM_ID.NONI_NONI,
    stakingToken: TOKENS.NONI_DOGECHAIN.tokenAddress,
    rewardToken: TOKENS.NONI_DOGECHAIN.tokenAddress,
    lpInfo: TOKENS.NONILP_DOGECHAIN,
    isLpToken: false,
    lpUrl: `https://dogeswap.org/#/swap?outputCurrency=${TOKENS.NONI_DOGECHAIN.tokenAddress}`,
  },
  [FARM_ID.DOGE_NONI]: {
    name: 'doge',
    label: 'wwDOGE',
    earn: 'NONI',
    chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
    stakingContract: '0x206949295503c4FC5C9757099db479dD5383A5dC',
    stakingToken: TOKENS.WWDOGECOIN_DOGECHAIN.tokenAddress,
    rewardToken: TOKENS.NONI_DOGECHAIN.tokenAddress,
    stakingPoolId: FARM_ID.DOGE_NONI,
    lpInfo: TOKENS.NONILP_DOGECHAIN,
    isLpToken: false,
    lpUrl: `https://dogeswap.org/#/swap?outputCurrency=${TOKENS.WWDOGECOIN_DOGECHAIN.tokenAddress}`,
  },
  // [FARM_ID.YUZU_DOGE]: {
  //   name: "yuzu_doge",
  //   label: "YUZU-DOGE",
  //   earn: "YUZU",
  //   chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
  //   stakingContract: "0x206949295503c4FC5C9757099db479dD5383A5dC",
  //   stakingPoolId: FARM_ID.YUZU_DOGE,
  //   lpContract: "0xf553fa1d10c8060eef81b350e92856aa4f5e90da",
  //   lpUrl: "https://dogeswap.org/#/pool",
  //   tokens: [TOKEN_ID.YUZU_DOGECHAIN, TOKEN_ID.WWDOGECOIN_DOGECHAIN],
  // },
  // [FARM_ID.YUZU_DOGE]: {
  //   name: "yuzu_doge",
  //   label: "YUZU-DOGE",
  //   earn: "NONI",
  //   chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
  //   stakingContract: "0x206949295503c4FC5C9757099db479dD5383A5dC",
  //   stakingPoolId: FARM_ID.YUZU_DOGE,
  //   lpContract: "0xf553fa1d10c8060eef81b350e92856aa4f5e90da",
  //   lpUrl: "https://dogeswap.org/#/pool",
  //   tokens: [TOKEN_ID.YUZU_DOGECHAIN, TOKEN_ID.WWDOGECOIN_DOGECHAIN],
  // },
  // [FARM_ID.NONI_DOGE]: {
  //   name: "noni_doge",
  //   label: "NONI-DOGE",
  //   earn: "NONI",
  //   chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
  //   stakingContract: "0x",
  //   stakingPoolId: FARM_ID.NONI_DOGE,
  //   lpContract: "",
  //   lpUrl: "https://dogeswap.org/#/pool",
  //   tokens: [TOKEN_ID.NONI_DOGECHAIN, TOKEN_ID.WWDOGECOIN_DOGECHAIN],
  // },
  // [FARM_ID.NONI]: {
  //   name: "noni",
  //   label: "NONI",
  //   earn: "NONI",
  //   chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
  //   stakingContract: "0x",
  //   stakingPoolId: FARM_ID.NONI,
  //   lpContract: "",
  //   lpUrl: "https://dogeswap.org/#/pool",
  //   tokens: [TOKEN_ID.NONI_DOGECHAIN],
  // },
  // [FARM_ID.YUZU]: {
  //   name: "yuzu",
  //   label: "YUZU",
  //   earn: "NONI",
  //   chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
  //   stakingContract: "0x",
  //   stakingPoolId: FARM_ID.YUZU,
  //   lpContract: "",
  //   lpUrl: "https://dogeswap.org/#/pool",
  //   tokens: [TOKEN_ID.YUZU_DOGECHAIN],
  // },
  // [FARM_ID.WDOGE]: {
  //   name: "wdoge",
  //   label: "wDOGE",
  //   earn: "NONI",
  //   chainId: SUPPORTED_CHAIN_ID.DOGECHAIN,
  //   stakingContract: "0x",
  //   stakingPoolId: FARM_ID.WDOGE,
  //   lpContract: "",
  //   lpUrl: "https://dogeswap.org/#/pool",
  //   tokens: [TOKEN_ID.WWDOGECOIN_DOGECHAIN],
  // },
  // [FARM_ID.TEST_FARM]: {
  //   name: "test",
  //   label: "Test Garden",
  //   earn: "FOOD",
  //   chainId: SUPPORTED_CHAIN_ID.DOGECHAIN_TEST,
  //   stakingContract: "0x81BEa4a89245Eb86Ab954a44F269982E09519484",
  //   stakingPoolId: 1,
  //   lpContract: "0xE5014bc21FC3663463Abe08A0174a833C0A36058",
  //   lpUrl: "https://",
  //   tokens: [TOKEN_ID.YUZU_DOGECHAIN, TOKEN_ID.WWDOGECOIN_DOGECHAIN],
  // },
};

export const getFarmDetails = (farmId: FARM_ID | string): FarmEntry => {
  if (!(farmId in FARMS)) throw new Error('FarmID is not supported');
  return FARMS[farmId];
};

/* TYPES
================================================== */
interface FarmProps {
  details: FarmEntry;
  farmId: string;
}

/* FARM COMPONENT
================================================== */
const Farm = ({ details, farmId }: FarmProps): JSX.Element => {
  /* Context
  ======================================== */
  const { state } = useContext(AppContext);
  const theme = useContext(ThemeContext);

  /* State
  ======================================== */
  const [open, setOpen] = useState<boolean>(false);
  const [stakeSection, setStakeSection] = useState<string>('stake');
  const [allowance, setAllowance] = useState<number>(0);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [tokensEarned, setTokensEarned] = useState<number | string>('...');
  const [tokensEarnedUsd, setTokensEarnedUsd] = useState<number | string>(
    '...'
  );
  const [stakedAmountPrice, setStakedAmountPrice] = useState<number | string>(
    '...'
  );
  const [time, setTime] = useState<number>(0);
  const [rewardRate, setRewardRate] = useState<string>('...');
  const [apr, setApr] = useState<string | number>('...');
  const [tvl, setTvl] = useState<string | number>('...');
  const [rerender, setRerender] = useState<boolean>(false);

  /* Handlers
  ======================================== */
  const handleOpen = (): void => {
    setOpen(!open);
    setStakeSection('stake');
  };
  /* Effects
  ======================================== */
  useEffect(() => {
    (async () => {
      try {
        const stakedAmount = await balanceOfStaking(
          state.connectedAccount?.provider as ethers.providers.Web3Provider,
          details.stakingContract,
          details.stakingPoolId,
          state.connectedAccount?.accounts[0] as string
        );

        const noniPriceInDoge = await uniswapPrice(
          details.rewardToken,
          TOKENS.WWDOGECOIN_DOGECHAIN.tokenAddress,
          TOKENS.NONILP_DOGECHAIN.tokenAddress,
          state.connectedAccount?.provider as ethers.providers.Web3Provider
        );
        const dogePrice = await getCoinGeckoPrice();

        const noniTokenPrice = noniPriceInDoge.multiply(
          new bigDecimal(dogePrice + '')
        );

        if (details.isLpToken) {
          const [reserve0, reserve1] = await getLpUnderlying(
            // @ts-ignore
            details.lpInfo.underlying[0],
            // @ts-ignore
            details.lpInfo.underlying[1],
            details.lpInfo.tokenAddress,
            state.connectedAccount?.provider as ethers.providers.Web3Provider
          );

          const priceInDoge = await uniswapPrice(
            details.stakingToken,
            TOKENS.WWDOGECOIN_DOGECHAIN.tokenAddress,
            details.lpInfo.tokenAddress,
            state.connectedAccount?.provider as ethers.providers.Web3Provider
          );

          const dogePriceUnderlying0 = new bigDecimal(
            formatEther(reserve0)
          ).multiply(priceInDoge);

          const totalDogePrice = dogePriceUnderlying0.add(
            new bigDecimal(formatEther(reserve1))
          );

          const lpTokenSupply = await totalSupply(
            state.connectedAccount?.provider as ethers.providers.Web3Provider,
            details.lpInfo.tokenAddress
          );

          const lpUsdPrice = totalDogePrice
            .multiply(new bigDecimal(dogePrice + ''))
            .divide(new bigDecimal(lpTokenSupply), 10);

          const stakedAmountPrice = lpUsdPrice.multiply(
            new bigDecimal(stakedAmount)
          );

          setStakedAmountPrice(stakedAmountPrice.getValue());

          const res = await getStakingPoolInfo(
            state.connectedAccount?.provider as ethers.providers.Web3Provider,
            details.stakingContract,
            details.stakingPoolId
          );

          const TVL = lpUsdPrice.multiply(
            new bigDecimal(formatEther(res.totalSupply))
          );

          setTvl(Number(TVL.getValue()).toFixed(2));
          setApr(
            new bigDecimal(
              formatEther(res.rewardRate.mul(60).mul(60).mul(24).mul(365))
            )
              .multiply(noniTokenPrice)
              .divide(TVL, 10)
              .multiply(new bigDecimal(100))
              .getValue()
          );
        } else if (
          details.stakingToken === TOKENS.WWDOGECOIN_DOGECHAIN.tokenAddress
        ) {
          const dogePrice = await getCoinGeckoPrice();

          const stakedAmountPrice = new bigDecimal(dogePrice + '').multiply(
            new bigDecimal(stakedAmount)
          );

          setStakedAmountPrice(stakedAmountPrice.getValue());

          const res = await getStakingPoolInfo(
            state.connectedAccount?.provider as ethers.providers.Web3Provider,
            details.stakingContract,
            details.stakingPoolId
          );
          const TVL = new bigDecimal(dogePrice + '').multiply(
            new bigDecimal(formatEther(res.totalSupply))
          );

          setTvl(Number(TVL.getValue()).toFixed(2));

          const priceInDoge = await uniswapPrice(
            details.stakingToken,
            TOKENS.WWDOGECOIN_DOGECHAIN.tokenAddress,
            details.lpInfo.tokenAddress,
            state.connectedAccount?.provider as ethers.providers.Web3Provider
          );
          const tokenPrice = priceInDoge.multiply(
            new bigDecimal(dogePrice + '')
          );

          setApr(
            new bigDecimal(
              formatEther(res.rewardRate.mul(60).mul(60).mul(24).mul(365))
            )
              .multiply(noniTokenPrice)
              .divide(TVL, 10)
              .multiply(new bigDecimal(100))
              .getValue()
          );
        } else {
          const priceInDoge = await uniswapPrice(
            details.stakingToken,
            TOKENS.WWDOGECOIN_DOGECHAIN.tokenAddress,
            details.lpInfo.tokenAddress,
            state.connectedAccount?.provider as ethers.providers.Web3Provider
          );

          const res = await getStakingPoolInfo(
            state.connectedAccount?.provider as ethers.providers.Web3Provider,
            details.stakingContract,
            details.stakingPoolId
          );

          const dogePrice = await getCoinGeckoPrice();

          const tokenPrice = priceInDoge.multiply(
            new bigDecimal(dogePrice + '')
          );

          const stakedAmountPrice = tokenPrice.multiply(
            new bigDecimal(stakedAmount)
          );

          setStakedAmountPrice(stakedAmountPrice.getValue());

          const TVL = tokenPrice.multiply(
            new bigDecimal(formatEther(res.totalSupply))
          );

          setTvl(Number(TVL.getValue()).toFixed(2));

          setApr(
            new bigDecimal(
              formatEther(res.rewardRate.mul(60).mul(60).mul(24).mul(365))
            )
              .multiply(noniTokenPrice)
              .divide(TVL, 10)
              .multiply(new bigDecimal(100))
              .getValue()
          );
        }
      } catch (error) {
        console.log(error);
      }
    })();
  }, [details, state.connectedAccount, rerender]);

  // Allowance
  useEffect(() => {
    (async () => {
      try {
        const allowance = await getAllowance(
          state.connectedAccount?.provider as ethers.providers.Web3Provider,
          details.stakingToken,
          state.connectedAccount?.accounts[0] as string,
          details.stakingContract
        );

        if (allowance === 0) setIsApproved(false);
        if (allowance > 0) setIsApproved(true);

        setAllowance(allowance);
      } catch (error) {
        console.log(error);
      }
    })();
  }, [details, state.connectedAccount, rerender]);

  // Tokens Earned
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const _earned = await earned(
          state.connectedAccount?.provider as ethers.providers.Web3Provider,
          details.stakingContract,
          state.connectedAccount?.accounts[0] as string,
          details.stakingPoolId
        );

        const dogePrice = await getCoinGeckoPrice();

        const tokenDogePrice = await uniswapPrice(
          details.rewardToken,
          TOKENS.WWDOGECOIN_DOGECHAIN.tokenAddress,
          TOKENS.NONILP_DOGECHAIN.tokenAddress,
          state.connectedAccount?.provider as ethers.providers.Web3Provider
        );

        const noniTokenPrice = tokenDogePrice.multiply(
          new bigDecimal(dogePrice + '')
        );

        const earnedNoniUsd = noniTokenPrice.multiply(new bigDecimal(_earned));

        setTokensEarned(_earned);
        setTokensEarnedUsd(Number(earnedNoniUsd.getValue()).toFixed(2));
      } catch (error) {
        console.error('Error retrieving earned amounts: ', error);
      }
    }, 1000);
    return () => clearInterval(interval);
  });

  // Time remaining
  useEffect(() => {
    (async () => {
      try {
        const res = await getStakingPoolInfo(
          state.connectedAccount?.provider as ethers.providers.Web3Provider,
          details.stakingContract,
          details.stakingPoolId
        );

        if (res) {
          setTime(BigNumber.from(res.finishAt).toNumber());
          setRewardRate(res.rewardRate);
        }
      } catch (error) {
        console.log(error);
      }
    })();
  }, []);

  /* Component Return
  ======================================== */
  return ()
};

/* EXPORTS
================================================== */
export default Farm;
