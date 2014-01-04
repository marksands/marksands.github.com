---
layout: post
permalink: /2013/07/11/fixing-uicolor.html
title: Fixing UIColor
category : Programming
tags: [programming, Objective-C]
comments: true
showads: true
---

### UIColor

`UIColor` is a commonly used class that represents color and sometimes opacity. As it turns out, `UIColor` is a class cluster made up of a couple of private concrete subclasses. 
Class clusters group a number of private concrete subclasses under a public abstract superclass; this is based on the abstract factory design pattern.[¹](http://developer.apple.com/library/mac/#documentation/Cocoa/Conceptual/CocoaFundamentals/CocoaObjects/CocoaObjects.html#//apple_ref/doc/uid/TP40002974-CH4-SW34)

### Red, Green, Blue

As of iOS 6, subclasses of the `UIColor` class cluster include [`UIDeviceWhiteColor`](https://github.com/nst/iOS-Runtime-Headers/blob/master/Frameworks/UIKit.framework/UIDeviceWhiteColor.h) 
and [`UIDeviceRGBColor`](https://github.com/nst/iOS-Runtime-Headers/blob/master/Frameworks/UIKit.framework/UIDeviceRGBColor.h). 
Unfortunately for the programmer, only `UIDeviceRGBColor` knows what red, green, and blue are, making it challenging to get the color components from a generic `UIColor` object.

According to Apple, `UIColor`'s method `getRed:green:blue:alpha:` will return the red, green, and blue color components if the color is within the RGB color space. 
If the color is in a compatible color space, the color is converted into RGB format and its components are returned to your application. 
If the color is not in a compatible color space, the parameters are unchanged.[²](http://developer.apple.com/library/ios/#documentation/UIKit/Reference/UIColor_Class/Reference/Reference.html#//apple_ref/occ/instm/UIColor/getRed:green:blue:alpha:) 
And therein lies the problem.

Say we have an API that accepts a `UIColor` object and uses its color components for some arbitrary computation. One might think, "`getRed:green:blue:alpha` to the rescue!" 
Sadly, this bruteforce approach will only work if the `UIColor` object is of the RGB color space, or the `UIDeviceRGBColor` class. The only approach is to inspect and retreive 
the color components using the Core Graphics functions `CGColorGetNumberOfComponents(color.CGColor)` and `CGColorGetComponents(color.CGColor)`. This approach quickly doesn't scale if you 
are constantly retreiving the color components for various reasons, so it would be ideal if `UIColor` handled this for us under the hood. For the curious, I have 
[created a radar](http://openradar.appspot.com/radar?id=3114410) in hopes to address this issue.

### A Universal Selector

Luckily for us, we have _objc/funtime.h_ that will provide exactly what we want. Using method swizzling, we can create an alternative to `getRed:green:blue:alpha` that 
checks the number of the color components using `getRed:green:blue:alpha` for `UIDeviceRGBColor` objects and `getWhite:alpha` for `UIDeviceWhiteColor` objects. The color 
components from `UIDeviceWhiteColor` objects are calculated by using the white balance as a multiplier for each RGB component. Using this approach, we have successfully 
moved the redundant color space checking behind the scenes and provided ourselves with much cleaner code snippets. The category implementation is below.

{% highlight objective-c linenos %}
#import <objc/runtime.h>

@implementation UIColor (ColorComponents)

+ (void)initialize
{
    if (self == [UIColor class])
    {
        Method oldMethod = class_getInstanceMethod(UIColor.class, @selector(getRed:green:blue:alpha:));
        Method newMethod = class_getInstanceMethod(UIColor.class, @selector(eds_getRed:green:blue:alpha:));
        method_exchangeImplementations(oldMethod, newMethod);
    }
}

- (BOOL)eds_getRed:(CGFloat *)red green:(CGFloat *)green blue:(CGFloat *)blue alpha:(CGFloat *)alpha
{
    if (CGColorGetNumberOfComponents(self.CGColor) == 4) {
        return [self eds_getRed:red green:green blue:blue alpha:alpha];
    }
    else if (CGColorGetNumberOfComponents(self.CGColor) == 2) {
        CGFloat white;
        CGFloat m_alpha;
        if ([self getWhite:&white alpha:&m_alpha]) {
            *red = white * 1.0;
            *green = white * 1.0;
            *blue = white * 1.0;
            *alpha = m_alpha;
            return YES;
        }
    }
    return NO;
}

@end

{% endhighlight %}


### References

* [[1] Cocoa Fundamentals Guide](http://developer.apple.com/library/mac/#documentation/Cocoa/Conceptual/CocoaFundamentals/CocoaObjects/CocoaObjects.html#//apple_ref/doc/uid/TP40002974-CH4-SW34)
* [[2] getRed:green:blue:alpha:](http://developer.apple.com/library/ios/#documentation/UIKit/Reference/UIColor_Class/Reference/Reference.html#//apple_ref/occ/instm/UIColor/getRed:green:blue:alpha:)