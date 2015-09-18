import RPi.GPIO as gpio
import time
import sys

gpio.setmode(gpio.BOARD)
# 35 = Up
gpio.setup(35, gpio.OUT) 
# 37 = Down
gpio.setup(37, gpio.OUT) 

def Shutdown():
    print 'Performing safe shutoff'
    gpio.output(37, False)
    gpio.output(35, False)
    gpio.cleanup()
    sys.exit('Motor shutdown, gpio cleared')

def RaiseDoor():
    print 'Raising door'
    gpio.output(35, True)
    gpio.output(37, False)

def LowerDoor():
    print 'Lowering door'
    gpio.output(35, False)
    gpio.output(37, True)

try:
    while True:
        RaiseDoor()
        time.sleep(5)
        LowerDoor()
        time.sleep(5)

except KeyboardInterrupt:
    print 'Keyboard Interrupt'

except:
    print 'Non Keyboard Interupt'

finally:
    Shutdown()
    
