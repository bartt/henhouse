import RPi.GPIO as gpio
import time
import datetime
import sys

gpio.setmode(gpio.BOARD)
# 15 = Top sensor
gpio.setup(15, gpio.IN) 
# 13 = Bottom sensor
# gpio.setup(13, gpio.IN) 

# 35 = Motor Up
gpio.setup(35, gpio.OUT) 
# 37 = Motor Down
gpio.setup(37, gpio.OUT) 

def RaiseDoor():
    print 'Raising door'
    gpio.output(35, True)
    gpio.output(37, False)

def LowerDoor():
    print 'Lowering door'
    gpio.output(35, False)
    gpio.output(37, True)

def StopDoor():
    print 'Stopping door'
    gpio.output(35, False);
    gpio.output(37, False)

def Shutdown():
    print 'Performing safe shutoff'
    StopDoor();
    gpio.cleanup()
    sys.exit('Motor shutdown, gpio cleared')

def SensorCallback(channel):
    timestamp = time.time()
    stamp = datetime.datetime.fromtimestamp(timestamp).strftime('%H:%M:%S')
    if gpio.input(channel):
        direction = "FALLING"
    else:
        direction = "RISING" 
    print "Sensor " + str(channel) + " " + direction + " " + stamp
  
def main():
    # Wrap main content in a try block so we can
    # catch the user pressing CTRL-C and run the
    # GPIO cleanup function. This will also prevent
    # the user seeing lots of unnecessary error
    # messages.
  
    # Top
    gpio.add_event_detect(15, gpio.BOTH, callback=SensorCallback)  

    # Bottom
    gpio.add_event_detect(13, gpio.BOTH, callback=SensorCallback)  
    
    try:
        while True:
            time.sleep(.1)
  
    except KeyboardInterrupt:
        print 'Keyboard Interrupt'
        
    except:
        print 'Non Keyboard Interupt'
        
    finally:
        Shutdown()

if __name__=="__main__":
    main()
