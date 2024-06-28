import { JsonRpcProvider } from "ethers";
import {
  BlockEvent,
  Finding,
  Initialize,
  HandleBlock,
  HealthCheck,
  HandleTransaction,
  HandleAlert,
  AlertEvent,
  TransactionEvent,
  FindingSeverity,
  FindingType,
  scanEthereum,
  scanPolygon,
  scanAlerts,
  runHealthCheck,
} from "@fortanetwork/forta-bot";

export const ERC20_TRANSFER_EVENT =
  "event Transfer(address indexed from, address indexed to, uint256 value)";
export const ERC20_TRANSFER_FUNCTION = "function transfer(address to, uint256 amount)"
export const TETHER_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
export const TETHER_DECIMALS = 6;
let findingsCount = 0;

export const handleTransaction: HandleTransaction = async (
  txEvent: TransactionEvent,
  provider: JsonRpcProvider
) => {
  const findings: Finding[] = [];

  // limiting this bot to emit only 5 findings so that the alert feed is not spammed
  if (findingsCount >= 5) return findings;

  // filter the transaction logs for Tether transfer events
  const tetherTransferEvents = txEvent.filterLog(
    ERC20_TRANSFER_EVENT,
    TETHER_ADDRESS
  );

  // filter the transcation functions for Tether transfer function
  const tetherTransferFunctions = txEvent.filterFunction(
    ERC20_TRANSFER_FUNCTION,
    TETHER_ADDRESS
  )  // using this we filer the transactions when the transfer function is called

  tetherTransferEvents.forEach((transferEvent) => {
    // extract transfer event arguments
    const { to, from, value } = transferEvent.args;
    // shift decimals of transfer value
    const normalizedValue = value / BigInt(10 ** TETHER_DECIMALS);

    // if more than 10000 Tether were transferred, report it
    if (normalizedValue > 10000) {

      console.log(normalizedValue.toString());  // printing amount of tether is transferred
      console.log(txEvent.transaction);  // prints the entire transaction

      findings.push(
        Finding.fromObject({
          name: "High Tether Transfer",
          description: `High amount of USDT transferred: ${normalizedValue}`,
          alertId: "FORTA-1",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            to,
            from,
          },
          source: {
            chains: [{ chainId: txEvent.chainId }],
            transactions: [{ hash: txEvent.hash, chainId: txEvent.chainId }],
          },
        })
      );
      findingsCount++;
    }
  });

  return findings;
};

// export const handleBlock: HandleBlock = async (blockEvent: BlockEvent, provider: JsonRpcProvider) => {
//   const findings: Finding[] = [];
//   // detect some block condition
//   return findings;
// }

// export const handleAlert: HandleAlert = async (alertEvent: AlertEvent) => {
//   const findings: Finding[] = [];
//   // detect some alert condition
//   return findings;
// }

// export const healthCheck: HealthCheck = async () => {
//   const errors: string[] = [];
//   // detect some custom health check condition
//   errors.push("not healthy due to some condition")
//   return errors;
// }

async function main() {
  scanEthereum({
    rpcUrl: "https://cloudflare-eth.com/",
    handleTransaction,
    // useTraceData: true
  });

  // scanPolygon({
  //   rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2",
  //   rpcKeyId: "d7f5e66f-0deb-4002-a52d-9b17ad254b38",
  //   localRpcUrl: "137",
  //   handleBlock,
  // });

  // scanAlerts({
  //   subscriptions: [{ botId: "0xbotId123" }],
  //   handleAlert,
  // });

  // health checks are required to run on scan nodes
  runHealthCheck();
}

// only run main() method if this file is directly invoked (vs just imported for testing)
if (require.main === module) {
  main();
}
