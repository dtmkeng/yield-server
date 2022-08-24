const sdk = require('@defillama/sdk');
const superagent = require('superagent');
const utils = require('../utils');
const { default: BigNumber } = require('bignumber.js');
const abi = require('./abi.json');
const MASTERCHEF_ADDRESS = '0x206949295503c4FC5C9757099db479dD5383A5dC';
const DOGE_BSC = '0xba2ae424d960c26247dd6c32edc70b295c744c43';
const NONI_TOKEN = '0xa4F9877A08F7639df15D506eAFF92Ab5E78273cd';
const WDOGE = '0xB7ddC6414bf4F5515b52D8BdD69973Ae205ff101';

const abiReserves = {
  "constant": true,
  "inputs": [],
  "name": "getReserves",
  "outputs": [
      {
        "internalType": "uint112",
        "name": "_reserve0",
        "type": "uint112"
      },
      {
        "internalType": "uint112",
        "name": "_reserve1",
        "type": "uint112"
      },
      {
        "internalType": "uint32",
        "name": "_blockTimestampLast",
        "type": "uint32"
      }
  ],
  "payable": false,
  "stateMutability": "view",
  "type": "function"
};

const balanceOfAbi = {
  "constant": true,
  "inputs": [
      {
          "internalType": "address",
          "name": "",
          "type": "address"
      }
  ],
  "name": "balanceOf",
  "outputs": [
      {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
      }
  ],
  "payable": false,
  "stateMutability": "view",
  "type": "function"
};

const tokenLpApi = (method) => {
  return {
    "constant": true,
    "inputs": [],
    "name": method,
    "outputs": [
        {
            "internalType": "address",
            "name": "",
            "type": "address"
        }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  };
}

const calculateReservesUSD = (
  reserves,
  reservesRatio,
  token0,
  token1,
  tokenPrices
) => {
  const { decimals: token0Decimals, address: token0Address } = token0;
  const { decimals: token1Decimals, address: token1Address } = token1;
  const token0Price = tokenPrices[token0Address.toLowerCase()];
  const token1Price = tokenPrices[token1Address.toLowerCase()];

  const reserve0 = new BigNumber(reserves._reserve0)
    .times(reservesRatio)
    .times(10 ** (18 - token0Decimals));
  const reserve1 = new BigNumber(reserves._reserve1)
    .times(reservesRatio)
    .times(10 ** (18 - token1Decimals));
  if (token0Price) return reserve0.times(token0Price).times(2);
  if (token1Price) return reserve1.times(token1Price).times(2);
};

const getPriceNoni = (reserves) => {
  return ((reserves[0] / reserves[1]));
};

const getPairInfo = async (pair, tokenAddress) => {
  const [tokenSymbol, tokenDecimals] = await Promise.all(
    ['erc20:symbol', 'erc20:decimals'].map((method) =>
      sdk.api.abi.multiCall({
        abi: method,
        calls: tokenAddress.map((address) => ({
          target: address,
        })),
        chain: 'dogechain',
        requery: false,
      }
    )
  ));
  return {
    lpToken: pair.toLowerCase(),
    pairName: tokenSymbol.output.map(e => e.output).join('-'),
    token0: {
      address: tokenAddress[0],
      symbol: tokenSymbol.output[0].output,
      decimals: tokenDecimals.output[0].output
    },
    token1: {
      address: tokenAddress[1],
      symbol: tokenSymbol.output[1].output,
      decimals: tokenDecimals.output[1].output
    }
  };
}


const getPrices = async (addresses) => {
  const prices = (
    await superagent.post('https://coins.llama.fi/prices').send({
      coins: addresses.map((address) => `bsc:${address}`),
    })
  ).body.coins;
  const pricesObj = Object.entries(prices).reduce(
    (acc, [address, price]) => ({
      ...acc,
      [address.split(':')[1].toLowerCase()]: price.price,
    }),
    {}
  );

  return pricesObj;
};

const apy = async () => {
  const poolLength = await sdk.api.abi.call({
    target: MASTERCHEF_ADDRESS,
    abi: abi.filter(e => e.name === "poolCounter")[0],
    chain: 'dogechain',
  });

  const poolsRes = await sdk.api.abi.multiCall({
    abi: abi.filter(({ name }) => name === 'pools')[0],
    calls: [...Array(Number(poolLength.output)).keys()].map((i) => ({
      target: MASTERCHEF_ADDRESS,
      params: i,
    })),
    chain: 'dogechain',
    requery: true,
  });


  const pools = poolsRes.output
    .map(({ output }, i) => ({ ...output, i }));
  const lpTokens = pools.map(({ stakingToken }) => stakingToken);

  const masterChefBalancesRes = await sdk.api.abi.multiCall({
    abi: balanceOfAbi,
    calls: pools.map(({ stakingToken }) => ({
      target: stakingToken,
      params: MASTERCHEF_ADDRESS,
    })),
    chain: 'dogechain',
    requery: true,
  });

  for(const pool of pools ) {
    try {
      const res = await sdk.api.abi.call({
        target: pool.stakingToken,
        abi: abiReserves,
        chain: 'dogechain',
      });
      pool['reserves'] = res.output;
      pool['isLp'] = true;
    } catch {
      pool['isLp'] = false;
    }
  }

  const [underlyingToken0, underlyingToken1] = await Promise.all(
    ['token0', 'token1'].map((method) =>
      sdk.api.abi.multiCall({
        abi: tokenLpApi(method),
        calls: pools.filter(e => e.isLp).map((address) => ({
          target: address.stakingToken,
        })),
        chain: 'dogechain',
        requery: true,
      })
    )
  );

  let tokens0 = underlyingToken0.output.map((res) => res.output);
  let tokens1 = underlyingToken1.output.map((res) => res.output);
  tokens0 = [...tokens0,  ...pools.filter(e => !e.isLp).map(e => e.stakingToken)];
  tokens1 = [...tokens1,  ...pools.filter(e => !e.isLp).map(e => e.stakingToken)];
  const tokensPrices = await getPrices([DOGE_BSC]);

  const noniPrice = await getPriceNoni(pools[2].reserves);
  tokensPrices[NONI_TOKEN.toLowerCase()] = noniPrice * tokensPrices[DOGE_BSC.toLowerCase()];
  tokensPrices[WDOGE.toLowerCase()] = tokensPrices[DOGE_BSC.toLowerCase()];
  const masterChefBalData = masterChefBalancesRes.output.map(
    (res, i) => res.output
  );

  const pairInfos = await Promise
    .all(pools.filter(e => e.isLp).map((_, index) => getPairInfo(lpTokens[index], [tokens0[index], tokens1[index]])));

  const poolsApy = [];
  for(const [i, pool] of pools.filter(e => e.isLp).entries()) {
    const pairInfo = pairInfos[i];
    const poolInfo = pool;
    const reserves = pool.reserves;

    const supply = pool.totalSupply;
    const masterChefBalance = masterChefBalData[i];
    console.log({supply, masterChefBalance})

    const masterChefReservesUsd = calculateReservesUSD(
      reserves,
      masterChefBalance/supply,
      pairInfo.token0,
      pairInfo.token1,
      tokensPrices
    )
      .div(1e18)
      .toString();

    poolsApy.push({
      pool: pool.stakingToken,
      chain: utils.formatChain('dogechain'),
      project: 'fruits-of-ryoshi',
      symbol: `${pairInfo.token0.symbol}-${pairInfo.token1.symbol}`,
      tvlUsd: Number(masterChefReservesUsd),
      apy: 0,
      underlyingTokens: [tokens0[i], tokens1[i]],
      rewardTokens: [NONI_TOKEN],
    });
  }
  return poolsApy;
};


module.exports = {
  timetravel: false,
  apy,
  url: 'https://fruitsofryoshi.com/',
};
