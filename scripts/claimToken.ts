import { Address, Cell, Dictionary } from '@ton/core';
import { claimMasterEntryValue } from '../wrappers/ClaimMaster';
import { NetworkProvider, compile } from '@ton/blueprint';
import { ClaimHelper } from '../wrappers/ClaimHelper';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { waitForStateChange } from './utils';

export async function run(provider: NetworkProvider) {
    // suppose that you have the cell in base64 form stored somewhere
    const dictCell = Cell.fromBase64(
        'te6cckEBBQEAhgACA8/oAgEATUgBXkdqCILh0PQ2sSrNftE0+xRx9GR+xJncvd79fC43/OKLLQXgEAIBIAQDAE0gAVeQTKvOEe38u3LKXrFWkd6VtAQPGeSKLMmk7CBMeBFKO5rKAEAATSAFNj+mB00w0+rZcvP1mD3Voj6fLT6a44VUskxi2FOR1mIdzWUAQBrhY8Y='
    );
    const dict = dictCell.beginParse().loadDictDirect(Dictionary.Keys.BigUint(256), claimMasterEntryValue);

    const entryIndex = 1n;

    const proof = dict.generateMerkleProof(entryIndex);

    const helper = provider.open(
        ClaimHelper.createFromConfig(
            {
                master: Address.parse('EQAckzjUET1SLIEvmsGWRyRVs5szYpRqC8ZV8P8SHfcIl48t'),
                index: entryIndex,
                proofHash: proof.hash(),
            },
            await compile('ClaimHelper')
        )
    );

    const isDeployed = await provider.isContractDeployed(helper.address);
    console.log('isDeployed', isDeployed);
    if (!isDeployed) {
        await helper.sendDeploy(provider.sender());
        await provider.waitForDeploy(helper.address);
    }

    const jettonMinterAddress = Address.parse('EQCaW2QXjg4cZ1VJmpx9o_4qeJO7uwnPOce5g8JVWR0XQGtq');
    const jettonMinter = provider.open(JettonMinter.createFromAddress(jettonMinterAddress));
    const jettonWalletAddr = await jettonMinter.getWalletAddress(provider.sender().address!);
    const jettonWallet = provider.open(JettonWallet.createFromAddress(jettonWalletAddr));
    console.log('balance before:', await jettonWallet.getJettonBalance());
    await helper.sendClaim(21n, proof); // 123 -> any query_id
    const balanceAfter = await waitForStateChange(provider.ui(), async () => await jettonWallet.getJettonBalance());
    console.log('balance after', balanceAfter);
    
}
