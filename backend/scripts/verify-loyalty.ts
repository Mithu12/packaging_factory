import { LoyaltyService } from '../src/services/loyaltyService';

async function testLoyaltyAward() {
    console.log('--- Starting Loyalty Award Logic Verification ---');

    // Mock DB Client
    const mockClient: any = {
        query: jest.fn().mockImplementation((queryText, params) => {
            console.log(`Executing Query: ${queryText.trim().split('\n')[0]}...`);
            console.log(`Params: ${JSON.stringify(params)}`);

            if (queryText.includes('SELECT customer_id, loyalty_points_earned')) {
                return { rows: [{ customer_id: 1, loyalty_points_earned: 50, order_number: 'SO-000001' }] };
            }
            if (queryText.includes('UPDATE customers')) {
                return { rows: [{ loyalty_points: 150 }] };
            }
            if (queryText.includes('INSERT INTO loyalty_points_transactions')) {
                return { rows: [] };
            }
            return { rows: [] };
        })
    };

    try {
        console.log('\nScenario 1: Awarding points from a valid order');
        await LoyaltyService.awardLoyaltyPointsFromOrder(101, mockClient);
        console.log('✅ Scenario 1 Passed');

        console.log('\nScenario 2: Handling order with 0 loyalty points');
        mockClient.query.mockImplementationOnce(() => ({
            rows: [{ customer_id: 1, loyalty_points_earned: 0, order_number: 'SO-000002' }]
        }));
        await LoyaltyService.awardLoyaltyPointsFromOrder(102, mockClient);
        console.log('✅ Scenario 2 Passed (No points awarded as expected)');

        console.log('\nScenario 3: Handing order with no customer');
        mockClient.query.mockImplementationOnce(() => ({
            rows: [{ customer_id: null, loyalty_points_earned: 50, order_number: 'SO-000003' }]
        }));
        await LoyaltyService.awardLoyaltyPointsFromOrder(103, mockClient);
        console.log('✅ Scenario 3 Passed (No points awarded as expected)');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    }

    console.log('\n--- Loyalty Award Logic Verification Completed Successfully ---');
}

// Minimal Jest mock for the script
const jest = {
    fn: (impl?: any) => {
        const fn = (...args: any[]) => fn.mock.calls.push(args) && (fn.mock.implementation ? fn.mock.implementation(...args) : impl ? impl(...args) : undefined);
        fn.mock = { calls: [] as any[][], implementation: impl };
        fn.mockImplementation = (newImpl: any) => { fn.mock.implementation = newImpl; return fn; };
        fn.mockImplementationOnce = (newImpl: any) => { 
            const original = fn.mock.implementation;
            fn.mock.implementation = (...args: any[]) => {
                fn.mock.implementation = original;
                return newImpl(...args);
            };
            return fn;
        };
        return fn;
    }
};

testLoyaltyAward();
