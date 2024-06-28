import { JsonRpcProvider, Result } from "ethers";
import { instance, mock, resetCalls, verify, when } from "ts-mockito";
import {
  Finding,
  FindingSeverity,
  FindingType,
  LogDescription,
  TransactionEvent,
} from "@fortanetwork/forta-bot";
import {
  handleTransaction,
  ERC20_TRANSFER_EVENT,
  TETHER_ADDRESS,
  TETHER_DECIMALS,
} from "./bot";

describe("high tether transfer agent", () => {
  const mockedTxEvent = mock(TransactionEvent);
  const mockedProvider = mock(JsonRpcProvider);

  beforeEach(() => {
    resetCalls(mockedTxEvent);
    resetCalls(mockedProvider);
  });

  describe("handleTransaction", () => {
    it("returns empty findings if there are no Tether transfers", async () => {
      when(
        mockedTxEvent.filterLog(ERC20_TRANSFER_EVENT, TETHER_ADDRESS)
      ).thenReturn([]);

      const findings = await handleTransaction(
        instance(mockedTxEvent),
        instance(mockedProvider)
      );

      expect(findings).toStrictEqual([]);
      verify(
        mockedTxEvent.filterLog(ERC20_TRANSFER_EVENT, TETHER_ADDRESS)
      ).once();
    });

    it("returns a finding if there is a Tether transfer over 10,000", async () => {
      const mockedTetherTransferEvent = mock<LogDescription>();
      const mockedResult = mock(Result);
      const from = "0xabc";
      const to = "0xdef";
      const value = BigInt("20000000000");
      when(mockedResult.from).thenReturn(from);
      when(mockedResult.to).thenReturn(to);
      when(mockedResult.value).thenReturn(value);
      when(mockedTetherTransferEvent.args).thenReturn(instance(mockedResult));
      const chainId = 1;
      const hash = "0x1234";
      when(mockedTxEvent.chainId).thenReturn(chainId);
      when(mockedTxEvent.hash).thenReturn(hash);
      when(
        mockedTxEvent.filterLog(ERC20_TRANSFER_EVENT, TETHER_ADDRESS)
      ).thenReturn([instance(mockedTetherTransferEvent)]);

      const findings = await handleTransaction(
        instance(mockedTxEvent),
        instance(mockedProvider)
      );

      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "High Tether Transfer",
          description: `High amount of USDT transferred: ${
            value / BigInt(10 ** TETHER_DECIMALS)
          }`,
          alertId: "FORTA-1",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            to,
            from,
          },
          source: {
            chains: [{ chainId }],
            transactions: [{ hash, chainId }],
          },
        }),
      ]);
      verify(
        mockedTxEvent.filterLog(ERC20_TRANSFER_EVENT, TETHER_ADDRESS)
      ).once();
    });
  });
});
