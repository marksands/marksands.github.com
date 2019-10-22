---
layout: post
permalink: /2019/10/21/better-codable-through-property-wrappers.html
title: Better Codable Through Property Wrappers
category : Programming
tags: [programming, swift, iOS]
comments: true
showads: true
---

With the introduction of Codable in Swift 4, working with JSON has never been more pleasant. Until it's not. Codable definitely has its warts, and often the pain is introduced by suffering through boilerplate of implementing custom Decodable initializers.

Fortunately, Swift 5.1 introduced a feature known as property wrappers that can take all of that boilerplate away. While it doesn't magically solve every painpoint with Codable, it definitely makes working with it much more pleasant. To that end, I've been accumulating my own wrappers on my GitHub at [github.com/marksands/BetterCodable](https://github.com/marksands/BetterCodable). Keep reading for a deep dive into their implementation and what it has to offer.

<!-- more -->

Recently I found myself working with an API that returned user objects. Except that many of the user objects had null data, so our struct initially looked like this:

```swift
struct User: Codable {
    var firstName: String?
    var surname: String?
    var jobTitle: String?
    var email: String?
}

struct UserResponse: Codable {
    var users: [User]
}
```

Needless to say, making every field an optional type was painful. One solution to the null data is to provide sensible defaults at the cost of implementing a custom Decodable initializer. But ideally, we really just don't want Users that don't satisfy valid data for all fields. Now we're left at a crossroad because we need the ability to decode an array of Users that might contain bad data yet discard the bad users. What we're looking for is essentially the Codable version of `arrayOfUses.compactMap { $0 }`, to filter out nils.

There are a few hurdles to overcome for this seemingly simple task. If the goal is to keep all fields non-optional, then we need to implement a custom initializer on the `UserResponse` type. When decoding a User value, if a non-optional field is found to be null, then an exception is thrown and the _entire_ UserResponse fails to decode. In order to ignore or filter out failed User elements, we have to go really into the weeds with Codable.

## Decoding the Array

First, we have to use an `unkeyedContainer()`, since we are decoding is a container of user values. This returns a container that conforms to `UnkeyedDecodingContainer`, which has a helpful property `isAtEnd` which indicates if the container has any further elements to decode. Once we iterate over the elements in the container, and decode them, ignoring failed User decodings, we set the users array to our intermediate elements array.

```swift
struct UserResponse: Codable {
    var users: [User]
    
    init(from decoder: Decoder) throws {
        var container = try decoder.unkeyedContainer()
        var elements: [User] = []
        while !container.isAtEnd {
            ...
        }
        
        users = elements
    }
}
```

Ignoring the erroneously decoded values is the interesting portion. If decoding a user fails, an exception is thrown, which we wrap in a do/catch statement so that decoding the remainder of the container is not in vain. Since the User failed to decode, we still need the container to progress beyond that value, however.

```swift
    do {
        let value = try container.decode(User.self)
        elements.append(value)
    } catch {
        _ = try? container.decode(???)
    }
```

The solution is rather clever. We simply need the container to decode _something_, so all it needs to know is that we have a Decodable type.

```swift
    private struct AnyDecodableValue: Decodable {}
    ...
    do {
        let value = try container.decode(User.self)
        elements.append(value)
    } catch {
        _ = try? container.decode(AnyDecodableValue.self)
    }
```

`AnyDecodableValue` is enough to allow the container to progress beyond this element and continue decoding the remainder of the users. Now that we know how to make a lossy decodable array, all that's left to do is genericize it and wrap it behind a property wrapper type for maximum reusability (and way less code). See [Apple's swift documentation](https://docs.swift.org/swift-book/LanguageGuide/Properties.html#ID617) for the real meat on implementing property wrappers.

Turning our solution into a generic property wrapper isn't too much additional work. Here's the final form. 

```swift
// Property wrappers require this annotation at the top level of the type
@propertyWrapper
public struct LossyArray<T: Codable>: Codable {
    // we previously saw the AnyDecodableValue technique
    private struct AnyDecodableValue: Codable {}

    // LossyDecodableValue is a single value of a generic type that we attempt to decode
    private struct LossyDecodableValue<Value: Codable>: Codable {
        let value: Value
        
        public init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            value = try container.decode(Value.self)
        }
    }
    
    // every property wrapper requires a wrappedValue
    public var wrappedValue: [T]
    
    public init(wrappedValue: [T]) {
        self.wrappedValue = wrappedValue
    }
    
    public init(from decoder: Decoder) throws {
        var container = try decoder.unkeyedContainer()
        
        var elements: [T] = []
        
        // continue decoding until we get to the last element
        while !container.isAtEnd {
            do {
                // try to decode an arbitrary value of our generic type T
                let value = try container.decode(LossyDecodableValue<T>.self).value
                elements.append(value)
            } catch {
                // if that fails, no sweat—we still need to move our decoding cursor past that element
                _ = try? container.decode(AnyDecodableValue.self)
            }
        }
        
        // and finally we store our elements
        self.wrappedValue = elements
    }
    
    public func encode(to encoder: Encoder) throws {
        try wrappedValue.encode(to: encoder)
    }
}
```

Our initial obstacle was overcome with our journey to property wrappers. Take a look at the simplified, final solution that gets us exactly what we want: a non-optional array of users with nothing but valid fields.

```swift
struct User: Codable {
    var firstName: String
    var surname: String
    var jobTitle: String
    var email: String
}

struct UserResponse: Codable {
    @LossyArray var users: [User]
}
```

## LossyDictionary

I took a similar approach with Dictionaries and created a `@LossyDictionary` property wrapper. It decodes Dictionaries and filters invalid key-value pairs if the decoder is unable to decode the value. I won't go into the weeds with this one, but I encourage the reader to take a look at the source for curiosity's sake. Shout out to the Swift source code for basically telling me verbatim how they decode Dictionaries—big help that open source code.

As an example, here's `@LossyDictionary` in practice.

```swift
struct Response: Codable {
    @LossyDictionary var values: [String: String]
}

let json = #"{ "values": {"a": "A", "b": "B", "c": null } }"#.data(using: .utf8)!
let result = try JSONDecoder().decode(Response.self, from: json)

print(result) // ["a": "A", "b": "B"]
```

## Default and Friends

Creating a property wrapper to assign a sensible default for a Codable property just isn't possible in Swift 5.1. In the meantime, I've created a few helpers that one may find useful.

Optional Bools are weird. A type that once meant true or false, now has three possible states: `.some(true)`, `.some(false)`, or `.none`. And the .none condition could indicate truthiness if BadDecisions™ were made. The weirdness of Optional Booleans extends to other types, such as Arrays. Soroush Khanlou has a [great blog post](http://khanlou.com/2016/10/emptiness/) explaining why you may want to avoid Optional Arrays.

Unfortunately, this idea doesn't come for free in Swift out of the box. Being forced to implement a custom initializer in order to nil coalesce nil booleans or nil arrays is no fun. That's why I added a few sane property wrappers that help provide sensible defaults for these disastrous situations.

#### @DefaultFalse

This does what it says on the box. It will ensure your nullable bool is set to `false` if the API insists on it being nil. The implementation isn't interesting but here's an example use case.

```swift
struct UserPrivilege: Codable {
    @DefaultFalse var isAdmin: Bool
}

let json = #"{ "isAdmin": null }"#.data(using: .utf8)!
let result = try JSONDecoder().decode(Response.self, from: json)

print(result) // UserPrivilege(isAdmin: false)
```

#### @DefaultEmptyArray

This will take your once-nullable container and leave you with an empty array upon decoding. Imagine a person with a collection of friends, or an album with a collection of reviews, or a pizza with a collection of toppings. Expressing emptiness, rather than missing, for these types, can do a lot for clarity. Here's an example usage.

```swift
struct Response: Codable {
    @DefaultEmptyArray var favorites: [Favorite]
}

let json = #"{ "favorites": null }"#.data(using: .utf8)!
let result = try JSONDecoder().decode(Response.self, from: json)

print(result) // Response(favorites: [])
```

An astute reader might observe that `@LossyArray` will produce the same result, but not without the unintended side effects of losing elements due to silent failures.

#### @DefaultEmptyDictionary

As mentioned previously, Optional Dictionaries are yet another container where nil and emptiness collide. This property wrapper decodes dictionaries and returns an empty dictionary instead of nil if the decoder is unable to decode the container. Here's an example usage:

```swift
struct Response: Codable {
    @DefaultEmptyDictionary var scores: [String: Int]
}

let json = #"{ "scores": null }"#.data(using: .utf8)!
let result = try JSONDecoder().decode(Response.self, from: json)

print(result) // Response(values: [:])
```

## @LosslessValue

All code and credit for this goes to [Ian Keen](https://twitter.com/iankay).

Somtimes APIs can be unpredictable. They may treat some form of Identifiers or SKUs as `Int`s for one response and `String`s for another. Or you might find yourself encountering `"true"` when you expect a boolean. This is where `@LosslessValue` comes into play. It will attempt to decode a value into the type that you expect, preserving the data that would otherwise throw an exception or be lost altogether.

I would love to dive into the source details of this wrapper, but this alone probably deserves its own post. It's rather dense and complex compared to the other wrappers. For the curious, [take a look at the source](https://github.com/marksands/BetterCodable/blob/99378904e47bc582acc45fd85ec738c24f61de30/Sources/BetterCodable/LosslessValue.swift) to see the machinery under the hood.

As an example, suppose you have a Product type that has a sku and an availability flag. Due to microservices, your backend team has waffled over whether or not the sku should be a string or an int, and the availability flag can be null because reasons. This might be one solution in this entirely hypothetical scenario.

```swift
struct Product: Codable {
    @LosslessValue var sku: String
    @LosslessValue var isAvailable: Bool
}

let json = #"{ "sku": 12345, "isAvailable": "true" }"#.data(using: .utf8)!
let result = try JSONDecoder().decode(Response.self, from: json)

print(result) // Response(sku: "12355", isAvailable: true)
```

## Date Wrappers

One common frustration with `Codable` is decoding entities that have mixed date formats. `JSONDecoder` comes built in with a handy `dateDecodingStrategy` property, but that uses the same date format for all dates that it will decode. And often, `JSONDecoder` lives elsewhere from the entity forcing tight coupling with the entities if you choose to use its date decoding strategy.

Property wrappers are a nice solution to the aforementioned issues. It allows tight binding of the date formatting strategy directly with the property of the entity, and allows the `JSONDecoder` to remain decoupled from the entities it decodes. Below are a few common Date strategies, but they also serve as a template to implement a custom property wrapper to suit your specific date format needs.

The property wrapper implementation is heavily inspired by [Ian Keen](https://twitter.com/iankay). It uses an internal decodable storage value that tracks the date as well as the original decoded type. The strategy is generic to work against strings or numbers.

```swift
protocol DateFormattingCodableStrategy {
    associatedtype RawValue: Codable

    static func decode(_ value: RawValue) throws -> Date
    static func encode(_ date: Date) -> RawValue
}

struct DateCodableValue<Formatter: DateFormattingCodableStrategy>: Codable {
    // we store the original value for encoding
    let value: Formatter.RawValue
    let date: Date

    init(date: Date) {
        self.date = date
        self.value = Formatter.encode(date)
    }
    
    init(from decoder: Decoder) throws {
        // our value is encoded as it otherwise would be from Codable
        self.value = try Formatter.RawValue(from: decoder)
        // our date is encoded by the custom implementation from our strategy
        self.date = try Formatter.decode(value)
    }
    
    func encode(to encoder: Encoder) throws {
        try value.encode(to: encoder)
    }
}
```

Any type that conforms to `DateFormattingCodableStrategy` and implements the decode/encode functions can serve as the storage type for the property wrapper. The simplest strategy is the unix timestamp implementation which decodes dates based on a numeric TimeInterval.

```swift
struct TimestampDateStrategy: DateFormattingCodableStrategy {
    static func decode(_ value: TimeInterval) throws -> Date {
        return Date(timeIntervalSince1970: value)
    }
    
    static func encode(_ date: Date) -> TimeInterval {
        return date.timeIntervalSince1970
    }
}
```

Marrying the storage with the strategy is the recipe needed to produce a desired property wrapper. Sadly this comes with a lot of redundant code across multiple property wrappers that only differ by the strategy type. For anyone reading, [hit me up](http://twitter.com/marksands) with improved solutions to this!

```swift
@propertyWrapper
public struct TimestampDate: Codable {
    // the engine of our wrapper using the TimestampDateStrategy to relay our date value
    private var storage: DateCodableValue<TimestampDateStrategy>
    
    public var wrappedValue: Date
    
    public init(wrappedValue: Date) {
        // initialize storage from a date
        self.storage = DateCodableValue(date: wrappedValue)
        self.wrappedValue = storage.date
    }
    
    public init(from decoder: Decoder) throws {
        // decode storage from data
        self.storage = try DateCodableValue(from: decoder)
        self.wrappedValue = storage.date
    }
    
    public func encode(to encoder: Encoder) throws {
        // encode our original value that's in our storage
        try self.storage.encode(to: encoder)
    }
}
```

The nice thing about these property wrappers is the ability to mix multiple date wrappers as needed for a given Codable struct. Without a custom initializer, using the built in date decoding strategy is impossible. The following example throws an exception with the error **"Expected date string to be ISO8601-formatted."**.

```swift
struct Response: Codable {
    var createdAt: Date // ISO8601
    var birthday: Date // y-MM-dd
}

let json = #"{ "createdAt": "2019-10-19T16:14:32-05:00", "birthday": "1984-01-22" }"#.data(using: .utf8)!
let decoder = JSONDecoder()
decoder.dateDecodingStrategy = .iso8601 
let result = try decoder.decode(Response.self, from: json) // 💥 Error!
```

Our hard work pays off. Multiple date wrappers to the rescue!


```swift
struct Response: Codable {
    @ISO8601Date var createdAt: Date
    @YearMonthDayDate var birthday: Date
}

let json = #"{ "createdAt": "2019-10-19T16:14:32-05:00", "birthday": "1984-01-22" }"#.data(using: .utf8)!
let decoder = JSONDecoder()
decoder.dateDecodingStrategy = .iso8601 
let result = try decoder.decode(Response.self, from: json) // ✅

// This produces two valid `Date` values, `createdAt` representing October 19, 2019 and `birthday` January 22nd, 1984.
```

## What's next?

This has been an experiment in improving life with Codable, and property wrappers just so happens to be the latest trend in achieving that goal. There are many more patterns left to be explored and implemented here, and hopefully this is the inspiration someone needs to keep going down this path.

* I have not toyed with property wrapper composition, which might yield even more impressive results.
* I have chosen to limit the number of date strategy wrappers because date formats can be so unwieldy.
* I tried really really hard to make a property wrapper that allows a single property to provide a custom CodingKey, without the enum, but it's just not possible. Hopefully future improvements to property wrappers allows possibility.
* [Let me know](http://twitter.com/marksands) what I should add, what bugs I should fix, or what you've created!