---
layout: post
permalink: /2014/10/16/pragma-poison.html
title: Pragma Poison
category : Programming
tags: [programming, Objective-C]
comments: true
showads: true
---

### stringValue

It can be tempting to convert NSNumbers to strings by calling `stringValue`. It's definitely less verbose than creating an NSNumberFormatter, specifying the number style, removing the grouping separator, and any other setup that's necessary. You may think calling `[@8.8 stringValue]` returns "8.8", but you'd be wrong; it actually returns "8.800000000000001". Let's take a look at what's going on behind the scenes when we call stringValue to find out why this is happening.

### Behind the Scenes

According to Apple's documentation regarding `stringValue`:[¹](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/Foundation/Classes/NSNumber_Class/Reference/Reference.html#//apple_ref/occ/instm/NSNumber/stringValue)

```
The string is created by invoking descriptionWithLocale: where locale is nil.
```

So far so good. Let's see what `descriptionWithLocale:nil` is doing. Also according to Apple's documentation:[²](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/Foundation/Classes/NSNumber_Class/Reference/Reference.html#//apple_ref/occ/instm/NSNumber/descriptionWithLocale:)

```
To obtain the string representation, this method invokes NSString’s initWithFormat:locale: method, 
supplying the format based on the type the NSNumber object was created with:
```

and goes on to list the format specifiers that the NSNumber value is casted to. From the chart, we can see that a double gets `%0.16g` as the format specifier.

Let's take what we've found and turn it into a single method call. So, `[@8.8 stringValue]` actually becomes `[[NSString alloc] initWithFormat:@"%.16g" locale:nil, 8.8]`. Now it makes sense why we are getting 16 digits instead of 2! Floating point conversion isn't perfect, so that's why we see some numbers like 8.8 become "8.800000000000001" and others such as 8.9 become "8.9".

### #pragma GCC poison stringValue

The bottom line is, in most cases, you never want 16 digits when converting simple doubles into a string. So now that we've deduced how `stringValue` can turn a 2 digit number into a 16 digit number, how do we prevent our peers from using this API? I came across a [stackoverflow post](http://stackoverflow.com/questions/17031349/how-do-i-mark-a-uikit-class-or-method-as-deprecated) for my answer. I tried a similar approach with creating a category and assigning `UNAVAILABLE_ATTRIBUTE`, but that wasn't working for me either.[³](http://stackoverflow.com/questions/17031349/how-do-i-mark-a-uikit-class-or-method-as-deprecated)

It turns out GCC originally provided a solution to this problem to poison certain identifiers. Thankfully clang has adopted this protocol as well. The posion pragma is designed to work with C symbols, but you can leave off the colon of your selector to make it work with Objective-C. Finally, all you need to do now is add `#pragma GCC poison stringValue` in your precompiled header and start replacing those calls with `NSNumberFormatter`!

```
#pragma GCC poison stringValue

ClassUsingStringValue.m:62:12: Attempt to use a poisoned identifier
```

### References

* [[1] stringValue](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/Foundation/Classes/NSNumber_Class/Reference/Reference.html#//apple_ref/occ/instm/NSNumber/stringValue)
* [[2] descriptionWithLocale:](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/Foundation/Classes/NSNumber_Class/Reference/Reference.html#//apple_ref/occ/instm/NSNumber/descriptionWithLocale:)
* [[3] stackoverflow](http://stackoverflow.com/questions/17031349/how-do-i-mark-a-uikit-class-or-method-as-deprecated)