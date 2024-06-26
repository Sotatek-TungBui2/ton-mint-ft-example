import { Address, Cell, Dictionary } from '@ton/core';
import { claimMasterEntryValue } from '../wrappers/ClaimMaster';
import { NetworkProvider, compile } from '@ton/blueprint';
import { ClaimHelper } from '../wrappers/ClaimHelper';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { waitForStateChange } from './utils';

export async function run(provider: NetworkProvider) {
    // suppose that you have the cell in base64 form stored somewhere
    // const dictCell = Cell.fromBase64(
    //     'te6cckEBBQEAiAACA8/oAgEAT0gBXkdqCILh0PQ2sSrNftE0+xRx9GR+xJncvd79fC43/OKgO5rKABACASAEAwBNIAU2P6YHTTDT6tly8/WYPdWiPp8tPprjhVSyTGLYU5HWYlloLwBAAE8gAh7pcvxa9Gteci/EiIzOJDTnFyED5Kc5dxjfnHn3j7lCi6Q7dABAuXVYSg=='
    // );
    // const dict = dictCell.beginParse().loadDictDirect(Dictionary.Keys.BigUint(256), claimMasterEntryValue);

    const entryIndex = 0n;

    // const proof = dict.generateMerkleProof(entryIndex);
    const proof = Cell.fromBoc(
        Buffer.from('b5ee9c724101060100a7000946030dde50f103edae646efec32f69ce442a2834667bf218938bbbbfa20da66137700002012203cfe80302284801014ddf9fa8119499785ef0b30459390756223b2ae064f37f17aa54ce82d3b44f780000220120050428480101593c53c3ea44a6e44bbb1cb21251f5092a0df3ccaef266d06cadf0be0be7230c0000004f20021ee972fc5af46b5e722fc4888cce2434e7172103e4a7397718df9c79f78fb9428ba43b7400404e79ef14', 'hex')
    )[0]

    const helper = provider.open(
        ClaimHelper.createFromConfig(
            {
                master: Address.parse('EQDKHmZlHidNgfA3AG0LblmaoihjbP_RIhnRCosd8l4BbP3t'),
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

    // call claim
    await helper.sendClaim(21n, proof); // 123 -> any query_id

    const balanceAfter = await waitForStateChange(provider.ui(), async () => await jettonWallet.getJettonBalance());
    console.log('balance after', balanceAfter);
    
}
