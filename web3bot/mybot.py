from web3 import Web3
import time

# Connect to an Ethereum node
w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/4615cd90da6b482f8d68d235506cab46'))

# Function to monitor the mempool
def monitor_mempool():
    print("Monitoring mempool for new transactions...")
    while True:
        mempool = w3.eth.get_block('pending', full_transactions=True).transactions
        for tx in mempool:
            process_transaction(tx)
        time.sleep(1)  # Polling interval

# Function to process and analyze transactions
def process_transaction(tx):
    # Example: Alert for transactions above a certain value
    threshold_value = w3.toWei(1, 'ether')
    if tx['value'] > threshold_value:
        print(f"High-value transaction detected: {tx['hash'].hex()}")
        # Additional logic can be added here (e.g., alerting, further analysis)

# Start monitoring
monitor_mempool()
