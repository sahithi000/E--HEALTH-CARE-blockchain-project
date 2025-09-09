require('dotenv').config();
const Web3 = require('web3');
const contractABI = require('./EHR.json'); // your existing ABI
const contractAddress = process.env.CONTRACT_ADDRESS;

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));

const ehrContract = new web3.eth.Contract(contractABI, contractAddress);

const addRecord = async (patientAddress, ipfsHash) => {
    const accounts = await web3.eth.getAccounts();
    const doctor = accounts[0]; // first Ganache account
    const tx = await ehrContract.methods.addRecord(patientAddress, ipfsHash).send({ from: doctor });
    return tx;
};

const getRecords = async (patientAddress) => {
    const records = await ehrContract.methods.getRecords(patientAddress).call();
    return records;
};

module.exports = { addRecord, getRecords };
