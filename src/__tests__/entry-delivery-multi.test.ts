import { isDeliveryChannelName } from "@/lib/services/financial-parser.service";
import { recomputeRecordTotals } from "@/lib/services/financial-records.service";

describe("Multi-channel Delivery and Extra Income Logic", () => {
  it("correctly classifies delivery platforms vs other income", () => {
    // Delivery channels
    expect(isDeliveryChannelName("LINE MAN")).toBe(true);
    expect(isDeliveryChannelName("ยอด LINE MAN")).toBe(true);
    expect(isDeliveryChannelName("Grab")).toBe(true);
    expect(isDeliveryChannelName("ShopeeFood")).toBe(true);
    expect(isDeliveryChannelName("Robinhood")).toBe(true);
    expect(isDeliveryChannelName("Foodpanda")).toBe(true);
    expect(isDeliveryChannelName("Delivery")).toBe(true);
    expect(isDeliveryChannelName("ไลน์แมน")).toBe(true);
    expect(isDeliveryChannelName("แกร็บ")).toBe(true);

    // Other / Extra income
    expect(isDeliveryChannelName("คนละครึ่ง")).toBe(false);
    expect(isDeliveryChannelName("ขายของเก่า")).toBe(false);
    expect(isDeliveryChannelName("รับเงินคืน")).toBe(false);
    expect(isDeliveryChannelName("โบนัส")).toBe(false);
  });

  it("calculates multi-delivery channels and extra income without double-counting", () => {
    const incomeItems = [
      { name: "LINE MAN", amount: 1500 },
      { name: "Grab", amount: 800 },
      { name: "ShopeeFood", amount: 400 },
      { name: "คนละครึ่ง", amount: 500 },
      { name: "ขายของเก่า", amount: 250 },
    ];

    const deliveryItems = incomeItems.filter((i) => isDeliveryChannelName(i.name));
    const deliveryTotal = deliveryItems.reduce((s, i) => s + i.amount, 0);

    const extraIncomeItems = incomeItems.filter((i) => !isDeliveryChannelName(i.name));
    const extraIncomeTotal = extraIncomeItems.reduce((s, i) => s + i.amount, 0);

    expect(deliveryTotal).toBe(2700); // 1500 + 800 + 400
    expect(extraIncomeTotal).toBe(750); // 500 + 250

    const transfer = 5000;
    const cash = 3000;
    const calculatedRevenue = transfer + cash + deliveryTotal + extraIncomeTotal;
    expect(calculatedRevenue).toBe(11450);

    // Verify backend recomputeRecordTotals works identically
    const totals = recomputeRecordTotals({
      transfer,
      cash,
      delivery: deliveryTotal,
      extraIncome: extraIncomeItems,
      extraExpenses: [],
      porkBreakdown: {
        redQty: 10,
        redPrice: 130,
        redTotal: 1300,
        mincedQty: 5,
        mincedPrice: 120,
        mincedTotal: 600,
        fatQty: 2,
        fatPrice: 80,
        fatTotal: 160,
        total: 2060,
      },
      materials: 0,
      supplies: 0,
      gas: 150,
      labor: 1500,
      ice: 35,
      revenue: 0,
    });

    expect(totals.delivery).toBe(2700);
    expect(totals.extraIncome).toEqual(extraIncomeItems);
    expect(totals.revenue).toBe(11450);
  });

  it("reconstructs loaded existing record items properly", () => {
    // Case 1: Record has delivery: 2300 and extraIncome: [{ name: "คนละครึ่ง", amount: 500 }]
    const existing = {
      delivery: 2300,
      extraIncome: [{ name: "คนละครึ่ง", amount: 500 }],
    };

    const loadedItems: { name: string; amount: number }[] = [];
    if (existing.extraIncome?.length) {
      loadedItems.push(...existing.extraIncome);
    }
    const hasDelivery = loadedItems.some((it) => isDeliveryChannelName(it.name));
    if (existing.delivery && existing.delivery > 0 && !hasDelivery) {
      loadedItems.unshift({ name: "Delivery", amount: existing.delivery });
    }

    expect(loadedItems).toEqual([
      { name: "Delivery", amount: 2300 },
      { name: "คนละครึ่ง", amount: 500 },
    ]);

    // Case 2: Record already has specific delivery channels inside extraIncome
    const existingWithChannels = {
      delivery: 2300,
      extraIncome: [
        { name: "LINE MAN", amount: 1500 },
        { name: "Grab", amount: 800 },
        { name: "คนละครึ่ง", amount: 500 },
      ],
    };

    const loadedChannels: { name: string; amount: number }[] = [];
    if (existingWithChannels.extraIncome?.length) {
      loadedChannels.push(...existingWithChannels.extraIncome);
    }
    const hasDeliveryChannel = loadedChannels.some((it) => isDeliveryChannelName(it.name));
    if (existingWithChannels.delivery && existingWithChannels.delivery > 0 && !hasDeliveryChannel) {
      loadedChannels.unshift({ name: "Delivery", amount: existingWithChannels.delivery });
    }

    expect(loadedChannels).toEqual([
      { name: "LINE MAN", amount: 1500 },
      { name: "Grab", amount: 800 },
      { name: "คนละครึ่ง", amount: 500 },
    ]);
  });
});
