---
layout: post
permalink: /2013/05/31/builder-pattern.html
category : Programming
tags: [programming, Objective-C, Design Patterns]
---

# The Builder Pattern

The builder pattern is a creational design pattern. It is used to abstract steps of the construction of complex objects from its representation so that the same construction process 
can create different representations.[¹](http://c2.com/cgi/wiki?DesignPatternsBook)

Complex objects that the builder pattern can be useful towards, for example, include building mazes, characters in video games, and perhaps even baking. However, these examples are 
somewhat of a stretch and don't provide any common ground for beginners. One thing I've found the builder pattern to be useful for is for building attributed labels.

Take, for example, Mattt Thompson's [TTTAttributedLabel](https://github.com/mattt/TTTAttributedLabel). It has some [pretty ugly](https://github.com/mattt/TTTAttributedLabel#example-usage) 
sample code on how to set the attributed text, which is enough to scare anyone away from attributed strings. Fortunately, this can be improved. One way to improve this is by extending 
`NSAttributedString` to use the builder pattern.

{% highlight objective-c linenos %}

NSAttributedString *string =  [[[[[[NSAttributedString alloc] initWithString:@"Hello World!"]
                                 addFont:[UIFont systemFontOfSize:18] string:@"Hello World!"]
                                addTextColor:[UIColor redColor] string:@"Hello World!"]
                               addFont:[UIFont systemFontOfSize:12] string:@"Hello"]
                              addTextColor:[UIColor blueColor] string:@"World!"];
                              
TTTAttributedLabel *attributedLabel = [[TTTAttributedLabel alloc] init];
attributedLabel.attributedText = string;

{% endhighlight %}

Here you can see the effects of the builder pattern in action, which is a much more attractive approach. And the implementation is trivial. 
Below is an NSAttributedString category with a stripped down version of the bigger picture.

{% highlight objective-c linenos %}

@interface NSAttributedString (Builder)

- (NSAttributedString *)addAttributes:(NSDictionary *)attributes range:(NSRange)range;
- (NSAttributedString *)addFont:(UIFont *)font string:(NSString *)string;
- (NSAttributedString *)addTextColor:(UIColor *)color string:(NSString *)string;

@end

@implementation NSAttributedString (Builder)

- (NSAttributedString *)addAttributes:(NSDictionary *)attributes
                                range:(NSRange)range
{
    NSMutableAttributedString *mutableString = [self mutableCopy];
    
    if (range.location != NSNotFound) {
        for (NSString *key in [attributes allKeys]) {
            id value = attributes[key];
            [mutableString addAttribute:key value:value range:range];
        }
    }
    
    return [mutableString copy];
}

- (NSAttributedString *)addFont:(UIFont *)font string:(NSString *)string
{
    NSRange range = [[self string] rangeOfString:string];
    
    CTFontRef ctfont = CTFontCreateWithName((__bridge CFStringRef)font.fontName, font.pointSize, NULL);
    NSDictionary *attributes = [NSDictionary dictionaryWithObject:(__bridge id)(ctfont) forKey:(NSString *)kCTFontAttributeName];
    CFRelease(ctfont);
    
    return [self addAttributes:attributes range:range];
}

- (NSAttributedString *)addTextColor:(UIColor *)color string:(NSString *)string
{
    NSRange range = [[self string] rangeOfString:string];
    NSDictionary *attributes = [NSDictionary dictionaryWithObject:(id)color.CGColor forKey:(NSString *)kCTForegroundColorAttributeName];
    return [self addAttributes:attributes range:range];
}

@end

{% endhighlight %}

And there you have it. Of course, you can do more than just modify the font and text color. You can see my full implementation on 
[GitHub](https://github.com/marksands/NSAttributedString-Builder). Please note, however, that this implementation is written specifically 
to work with TTTAttributedLabel. If you want support for attributed text on UILabel in iOS6, check out the [iOS6 branch](https://github.com/marksands/NSAttributedString-Builder/tree/iOS6).

### References

* [[1] Design Patterns: Elements of Reusable Object-Oriented Software](http://c2.com/cgi/wiki?DesignPatternsBook)
