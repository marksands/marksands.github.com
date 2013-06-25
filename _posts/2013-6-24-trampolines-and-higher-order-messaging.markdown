---
layout: post
permalink: /2013/06/24/trampolines-and-higher-order-messaging.html
category : Programming
tags: [programming, Objective-C, Design Patterns]
---

# Trampolines & Higher Order Messaging

### Trampolines

A trampoline is a small piece of code that is created at run time when the address of a nested function is taken. 
It normally resides on the stack, in the stack frame of the containing function. The word trampoline is used because execution jumps 
into the trampoline object and then immediately jumps out.[¹](http://gcc.gnu.org/onlinedocs/gccint/Trampolines.html)

A trampoline object in Objective-C is a subclass of `NSProxy` that is returned by a method and acts like a delegate by forwarding messages to another object. 
This brings us to higher order messaging.

### Higher Order Messaging

Higher order messaging allows messages that have messages as arguments. This is analogous to languages that treat functions as a first-class data type, 
like Lisp, Haskell, and PHP do. Even C and its descendants can use function pointers, although it's not as pretty. Objective-C is a perfect candidate for 
higher order messaging, or HOM, since the language is known for its message passing traits.[²](http://www.macdevcenter.com/pub/a/mac/2004/07/16/hom.html?page=last&x-order=date)

The code for a trampoline object is quite trivial. The implementation below is specialized for an `NSArray` and assumes ARC is enabled. The `#pragma` cruff 
is necessary to silence warnings.

{% highlight objective-c linenos %}

@interface TFFTrampoline : NSProxy {
    id tff_target;
    SEL tff_selector;
}
+ (id)trampolineWithTarget:aTarget selector:(SEL)newSelector;
@end
 
@implementation TFFTrampoline

- (void)forwardInvocation:(NSInvocation*)anInvocation {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Warc-performSelector-leaks"
    id result = [tff_target performSelector:tff_selector withObject:anInvocation];
    [anInvocation setReturnValue:&result];
#pragma clang diagnostic pop
}
 
- (id)methodSignatureForSelector:(SEL)aSelector {
    return [[tff_target objectAtIndex:0] methodSignatureForSelector:aSelector];
}
 
- (id)tff_initWithTarget:aTarget selector:(SEL)aSelector {
    tff_target = aTarget;
    tff_selector = aSelector;
    return self;
}
 
+ (id)trampolineWithTarget:aTarget selector:(SEL)aSelector {
    return [[self alloc] tff_initWithTarget:aTarget selector:aSelector];
}

@end

{% endhighlight %}

This is the basic implementation for a trampoline object. For our intents and purposes, we will be using it to create a category on `NSArray` to add a `collect` method. You might see some 
programmers use `do` as their method name of choice, but since `do` is a keyword, I will avoid that route.

{% highlight objective-c linenos %}

@interface NSArray (Collect)
- (id)collect;
@end
  
@implementation NSArray (Collect)

- (NSArray *)collect:(NSInvocation *)anInvocation {
    NSMutableArray *resultArray = [NSMutableArray array];
    
    for (id obj in self) {
        __unsafe_unretained id resultObject;
        [anInvocation invokeWithTarget:obj];
        [anInvocation getReturnValue:&resultObject];
        [resultArray addObject:resultObject];
    }
    return resultArray;
}

- (id)collect {
    return [TFFTrampoline trampolineWithTarget:self selector:@selector(collect:)];
}

@end

{% endhighlight %}

Here, our `NSArray` category implements a public `collect` method that will return our trampoline object to bounce the method argument to the private `collect:` method 
that uses the forwarded `NSInvocation` to assist with the bouncing.

Last but not least, below is an example of how one would use this implementation.

{% highlight objective-c linenos %}

int main(int argc, char *argv[]) {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wincompatible-pointer-types"
    @autoreleasepool {
        // Modify
        NSArray *smallCasedString = @[ @"small", @"cased", @"words" ];
        NSArray *uppercasedStrings = [[smallCasedString collect] uppercaseString];
        
        // Convert
        NSArray *floats = @[ @(3.14), @(2.71), @(0.577) ];
        NSArray *floatStrings = [[floats collect] stringValue];
        
        // An exercise for the reader could be to implement a select method to filter results
        NSArray *dogs = @[ @"Scooby", @"Clifford", @"Snoopy" ];
        NSArray *redDogs = [[dogs select] isNamed:@"Clifford"];
    }
#pragma clang diagnostic pop
}

{% endhighlight %}

And that's all there is to it. This might look more complicated than necessary to accomplish iteration, but benefits do exist. Having a one-off solution is 
good for writing this once and only once, which can also provide assurance of getting rid of one-off errors, and loops are optimized more easily when they are
internalized in this manner.

There are many more uses for HOM than iteration, but methods such as `collect` seem to be the most commonly used higher-order methods. Another use 
case could be a protocol checker to act as a proxy for an object and only pass messages through that are part of a given protocol, but the possibilities are, 
of course, endless.[²](http://www.macdevcenter.com/pub/a/mac/2004/07/16/hom.html?page=last&x-order=date)


### References

* [[1] Design Patterns: Elements of Reusable Object-Oriented Software](http://c2.com/cgi/wiki?DesignPatternsBook)
* [[2] Higher-Order Messages in Cocoa](http://www.macdevcenter.com/pub/a/mac/2004/07/16/hom.html?page=last&x-order=date)
* [[3] Simple HOM](http://blog.metaobject.com/2009/01/simple-hom.html)