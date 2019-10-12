---
layout: post
permalink: /2019/10/12/you-should-use-phantom-types.html
title: You Should Use Phantom Types
category : Programming
tags: [programming, swift, iOS]
comments: true
showads: true
---

Phantom types have been [written](https://www.swiftbysundell.com/articles/phantom-types-in-swift/) [and](https://www.natashatherobot.com/swift-money-phantom-types/)
 [talked](https://www.pointfree.co/episodes/ep12-tagged) [about](https://kean.github.io/post/phantom-types) [enough](https://www.objc.io/blog/2014/12/29/functional-snippet-13-phantom-types/), so I don't personally have much to add to the conversation. Instead, I decided to try my luck with Phantom Types to see how well it fits in with my programming style and how ergonomic it feels in "real" code.

<!-- more -->

Imagine we are working with `Cart` and `Item` entities. A `Cart` contains `Item`s and they have unique identifiers as integers, much to my chagrin. My preferred mode of using integers in API entities is generally only when math might be involved. I have too many horror stories involving integer fields and leading zeros to make your head spin. `String` is your friend, or, in this case, Phantom Types.

The `Cart` and `Item` entities might look like this, with other fields omitted for brevity.

```swift
struct Cart: Equatable {
    let id: Int
    let items: [Item]
}

struct Item: Equatable {
    let id: Int
    let name: String
}
```

While this looks benign, let's add a function on `Cart` that will return a new `Cart` by omitting an `Item`. To remove the `Item`, we'll pass in the item's `id` to look it up by value.

```swift
struct Cart: Equatable {
    let id: Int
    let items: [Item]
    
    func removingItem(byId id: Int) -> Cart {
        guard let item = items.first(where: { $0.id == id }) else { return self }
        return Cart(id: id, items: items.filter { $0 != item })
    }
}
```

This code compiles, but we've introduced a nasty, subtle bug. When the new `Cart` is instantiated, it passes `id` which uses the parameter instead of the `Cart`'s `id` field. If instead we initialized the `Cart` like so `Cart(id: self.id, ...` then we'd be in good shape. I personally reserve the use of `self` when closures and capture semantics come into play so future me is more aware of potential strong reference cycles.

Fortunately, we have a working test suite, so surely we can find and fix the bug through a good old unit test. But if you're not thorough, a single unit test isn't guaranteed to find the bug.

```swift
func testRemovingCartItemReturnsModifiedCart() {
    let item1 = Item(id: 1, name: "Box")
    let item2 = Item(id: 2, name: "Envelope")

    let cart = Cart(id: 1, items: [item1, item2])
    
    let modifiedCart = cart.removingItem(byId: 1)
    XCTAssertEqual(modifiedCart, Cart(id: 1, items: [item2]))
}
```

We might write a single test with a single assertion, observe a green suite, and call it a day patting ourselves on the back for being good test citizens, or something.

The human element is still very much present when writing unit tests, and they can never provide as solid of a safety guarantee as compile time feedback. In my daily Swift, I have found myself writing much fewer unit tests than when I was using Ruby or Objective-C. Because as it turns out, Swift can provide much of that compile time saftey and guarantee through type safety that unit tests cannot.

We can expand our unit test by using random `id` values, or adding more tests and assertions, but with the potential for this bug to creep in elsewhere in the code, is it worth it? Let's see what happens when we swap out our `Int` type with our Phantom Type.

Here's our thin Identifier Phantom Type, inspired by PointFree's [Tagged library](https://github.com/pointfreeco/swift-tagged):

```swift
public struct Identifier<T, RawValue>: RawRepresentable {
    public var rawValue: RawValue
    
    public init(rawValue: RawValue) {
        self.rawValue = rawValue
    }
}

extension Identifier: Equatable where RawValue: Equatable { }

extension Identifier: ExpressibleByIntegerLiteral where RawValue: ExpressibleByIntegerLiteral {
    public typealias IntegerLiteralType = RawValue.IntegerLiteralType

    public init(integerLiteral: IntegerLiteralType) {
        self.init(rawValue: RawValue(integerLiteral: integerLiteral))
    }
}
```

Now our `Cart` and `Item` can use our more expressive and type safe addition.

```swift
struct Cart: Equatable {
    let id: Identifier<Cart, Int>
    let items: [Item]
}

struct Item: Equatable {
    let id: Identifier<Item, Int>
    let name: String
}
```

Now that we have leveled up our type safety skills, we can revisit the extension from earlier and see what happens when we instantiate our new `Cart`. Since we're no longer referring to plain old integer types for our identifiers, we pass in the new `Identifier<Item, Int>` type. I don't know about you, but this feels more in tune with the spirit of Swift by passing in a specifc, narrow type geared at an `Item`'s identifier, than blindly tossing around integers that could mean anything.

```swift
func removingItem(byId id: Identifier<Item, Int>) -> Cart {
    guard let item = items.first(where: { $0.id == id }) else { return self }
    return Cart(id: id, items: items.filter { $0 != item })
}
```

A funny thing happens when we try to compile this code. Before, when we were passing an `Int` in our parameter, the code compiled just fine. And only after adding some unit tests would we _maybe_ encounter the bug.

Believe it or not, Swift actually provides a really good error message on our `return` line: **Cannot convert value of type 'Identifier<Item, Int>' to expected argument type 'Identifier<Cart, Int>'**.

You better believe we cannot mix `Cart` identifiers with `Item` identifiers! And what's great is that this bug was caught at compile time, without having to run our application and trip over the bug or write superfluous unit tests in order to spot the issue. Maybe there's a lesson in unit testing to be had here, I'm not really sure—another time, perhaps.

I love stumbling upon these moments of enlightment and basking in the satisfaction they bring. And I'm more than satisfied with this simple and freeing addition. It increases the feedback loop of finding bugs as well as setting up the code base for success for by preventing this mistake from happening again. And if you're not already using them, you should use Phantom Types!