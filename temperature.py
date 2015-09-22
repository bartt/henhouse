import os
import xively
import subprocess
import time
import datetime
import requests

# extract feed_id and api_key from environment variables
FEED_ID = os.environ["FEED_ID"]
API_KEY = os.environ["API_KEY"]
DEBUG = os.environ["DEBUG"] or false

# initialize api client
api = xively.XivelyAPIClient(API_KEY)

class Sensor:
    def __init__(self, name):
        self.name = name
        self.file_name = "/sys/devices/w1_bus_master1/" + name + "/w1_slave"
        self.last_good_temp = 0

    def read(self):
        with open(self.file_name) as f:
            content = f.readlines()
            for line in content:
                # sometimes CRC is bad, so we will return last known good temp
                if line.find('crc=')>=0 and line.find('NO')>=0:
                    return self.last_good_temp
                p = line.find('t=')
                if p >= 0:
                    self.last_good_temp = float(line[p+2:])/1000.0
                    return self.last_good_temp
        return 0.0
                                                                                                                                                       
def run():
    feed = api.feeds.get(FEED_ID)

    sensor_outside = Sensor("28-0000065baea6")
    temp_outside = feed.datastreams.get("TempOutside")
    temp_outside.max_value = None
    temp_outside.min_value = None

    sensor_inside = Sensor("28-000005fb1ddb")
    temp_inside = feed.datastreams.get("TempInside")
    temp_inside.max_value = None
    temp_inside.min_value = None
    
    while True:
        temp_outside.current_value = sensor_outside.read()
        temp_outside.update(fields=['current_value'])
        temp_inside.current_value = sensor_inside.read()
        temp_inside.update(fields=['current_value'])
        time.sleep(10)
    
run()
