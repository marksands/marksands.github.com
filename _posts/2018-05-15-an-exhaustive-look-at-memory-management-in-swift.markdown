---
layout: post
permalink: /2018/05/15/an-exhaustive-look-at-memory-management-in-swift.html
title: An Exhaustive Look At Memory Management in Swift
category : Programming
tags: [programming, swift, iOS]
comments: true
showads: true
---

## A Glossary of Terms

### ARC

ARC, or Automatic Reference Counting, is the compiler provided solution to Manual Retain-Release. MRR required the developer to manually insert `retain` and `release` functions to track uses of references, which one can imagine is a recipe for disaster. This concoction made it easy to introduce memory leaks, led to error prone code, and added tedious boilerplate. And so along came ARC, because after all, Apple has to take steps to avoid Copland 2010.

The original [Transitioning to ARC Release Notes](https://developer.apple.com/library/content/releasenotes/ObjectiveC/RN-TransitioningToARC/Introduction/Introduction.html#//apple_ref/doc/uid/TP40011226) dive into more detail about how ARC works, but this post will primarily focus on Swift, especially when it comes to dealing with memory in closures.

<!-- more -->

To ensure that instances of objects don’t disappear while they are still used, ARC tracks the usages of reference types that are referencing each instance. ARC will not deallocate an instance as long as at least one active reference to that instance still exists.

### strong

Strong references mean exactly that: a firm hold on a variable. Whenever one assigns a reference type to a variable, then that variable maintains a strong reference to that instance. That is, the strong reference keeps a firm grasp on the variable and will not allow it to be deallocated as long as the strong reference remains.

Under ARC, strong is the default for object types. Unlike Objective-C, Swift has no keyword to specify that an object should be annotated as a strong reference. Instead, strong is the default.

```swift
class Person {
    let name = "Morgan"
}
```

> Note: In Objective-C, `strong` was used as a keyword to annotate a property as a strong reference. In Swift, there is no equivalent keyword as this is the default.

### weak

Conversely, weak references do not prevent ARC from deallocating their referred instances. Thus, a weak reference is a reference to an object that does not maintain a strong hold on the variable, which prevents strong reference cycles—more on that later.

A weak reference does not extend the lifetime of the object it points to, and automatically becomes nil when the object is deallocated. Since ARC can automatically set weak references to nil at runtime, they can only be declared as optional variables.

```swift
class Person {
    weak var parent: Parent?
}
```

> Note: In Objective-C, `weak` was used as a keyword to annotate a property as a weak reference. Swift uses the same keyword to annotate variables as weak references.

### unowned

In Swift `unowned` variables will _always_ contain a value without the possibility of it turning into a dangling pointer. If an unowned reference is accessed after the instance has been deallocated, then a runtime error will occur.

`unowned` is _safe_, in that if the instance is accessed after it has been deallocated, it will always stop the execution of the program on that line and will not access the memory location of where the instance used to live.

```swift
class Page {
    unowned let document: Document

    init(document: Document) {
        self.document = document
    }
}
```

There has been a lot of confusion on when to use `weak` or `unowned` in Swift, to the degree that some developers simply never use `unowned` in fear of it causing the app to crash at runtime. When using `unowned`, it is important to be absolutely certain that the instance containing the `unowned` reference never outlives the `unowned` reference.

> Note: There is no equivalent of `unowned` in Objective-C.

### unowned(unsafe)

The _unsafe_ equivalent of `unowned` is `unowned(unsafe)`. Accessing the reference of an `unowned(unsafe)` instance after it has been deallocated will result in accessing the memory location where the instance previously lived, which is deemed unsafe.

```swift
class ImageProcessor {
    func processImage(_ image: CIImage) {
        imageFilter.process(image, handler: { [unowned(unsafe) self] in
            // process image
        }
    }
}
```

> Note: In Objective-C, `assign` or `unsafe_unretained` was used as a property attribute to specify that a reference does not keep the referred object alive nor does it set it to nil when there are no remaining strong references to the object. If the object it references is deallocated, then the pointer is left dangling. Swift uses the keyword `unowned(unsafe)` to mean the semantic equivalent.

> After much searching to determine if `assign` and `unsafe_unretained` were indeed interchangeable with respect to memory ownership, this [clang documentation](https://clang.llvm.org/docs/AutomaticReferenceCounting.html#property-declarations) and [this block of code in clang](https://github.com/llvm-mirror/clang/blob/4d48be1aa7744f3e4f5b0a53dad7fdde7885da41/lib/Sema/SemaObjCProperty.cpp#L167-L173) validated this assumption.

### unowned(safe)

This is a very little known memory reference type that has zero documentation.

> 🤷🏼‍♀️ rdar://40080779

### autoreleasepool

[Ownership of objects](https://developer.apple.com/library/content/documentation/Cocoa/Conceptual/MemoryMgmt/Articles/mmPractical.html#//apple_ref/doc/uid/TP40004447-SW2) is implemented through reference counting. Before ARC, reference counts, or retain counts, were manually managed by using the `retain` and `release` methods, which would increment or decrement the retain count. To defer releasing an object, the `autorelease` method was used which would decrement the retain count by 1 at the end of what's called an autorelease pool.

Since ARC manages the reference counts automatically, there is no equivalent `autorelease` method. However, there are still autoreleased objects so `autoreleasepool` blocks exist instead of directly interfacing with `NSAutoreleasePool`. Autorelease pool blocks provide a mechanism to relinquish ownership of an object without the possibility of it being immediately deallocated.

Autorelease pools are great for [reducing peak memory footprint](https://developer.apple.com/library/content/documentation/Cocoa/Conceptual/MemoryMgmt/Articles/mmAutoreleasePools.html#//apple_ref/doc/uid/20000047-SW2). Within a block of code, it's possible to accumulate many temporary objects before the end of the current event-loop that add substantial memory overhead. In this situation, disposing of the objects sooner will reduce the memory overhead at the end of each block.

Using an `autoreleasepool` block will reduce the memory overhead in the `for` loop below by disposing of the data after each iteration rather than continue to accumulate memory until the end of the event-loop iteration.

```swift
for file in files {
    autoreleasepool {
        let data = Data(contentsOfFile: file)
        // process data
    }
}
```

See the [NSAutoreleasePool documentation](https://developer.apple.com/documentation/foundation/nsautoreleasepool) and [Using Autorelease Pool Blocks](https://developer.apple.com/library/content/documentation/Cocoa/Conceptual/MemoryMgmt/Articles/mmAutoreleasePools.html) for more information.

### Strong Reference Cycles

If two class instances hold a strong reference to each other, each keeping the other instance alive, then it's possible that either instance could never get to a point where it has zero strong references. This is known as a **strong reference cycle** in ARC ([formerly known](https://developer.apple.com/library/content/releasenotes/ObjectiveC/RN-TransitioningToARC/Introduction/Introduction.html#//apple_ref/doc/uid/TP40011226-CH1-SW4) as a retain cycle).

Here's an example that shows a `Person` object holding a strong reference to their `Pet`, and a `Pet` holding a strong reference to a `Person`.

```swift
class Person {
    var pet: Pet?
}

class Pet {
    var owner: Person?
}

person.pet = pet
pet.owner = person
```

In the above sample code, the `person` instance holds a strong reference to the `pet` instance, which in turn holds a strong reference to the `person` instance, thus creating a strong reference cycle. Both object's properties, being strong references by default, are keeping each other alive.

### Testing for Strong References

It's one thing to look at code and have confidence that a reference cycle exists, but it's another thing to know for certain. Fortunately, it's simple enough to write a unit test to check for strong reference cycles.

Using our code sample from above, we can initialize our instances, assign the person instance to a weak reference, and assert that explicitly nilling out the strong reference also released the weak reference.

```swift
func test() {
    var person: Person? = Person()
    var pet = Pet()

    person.pet = pet
    pet.owner = person

    weak var weakPerson = person
    person = nil

    XCTAssertNil(weakPerson)
}
```

Unfortunately, with the current state of our `Person` and `Pet` implementation, our assertion fails. The `weak` reference in the assertion is _not_ nil, indicating that there's a strong reference cycle.

### Resolving Strong Reference Cycles with Weak

From the [ARC Release Notes](https://developer.apple.com/library/content/releasenotes/ObjectiveC/RN-TransitioningToARC/Introduction/Introduction.html#//apple_ref/doc/uid/TP40011226-CH1-SW4):

> ARC does not guard against strong reference cycles. Judicious use of weak relationships will help to ensure you don’t create cycles.

In order to break the strong reference cycle, we need to rely on `weak` references, since `weak` references will not retain the object longer than is necessary.

In order to keep the object graph intact, there still needs to be at least one strong reference otherwise the instances are at risk of being deallocated.

Cocoa [establishes a convention](
https://developer.apple.com/library/content/documentation/Cocoa/Conceptual/MemoryMgmt/Articles/mmPractical.html#//apple_ref/doc/uid/TP40004447-1000810) that a _parent_ object should hold strong references to its _children_, and that the children should have weak references to their parents.

By applying this knowledge, the strong reference cycle in sample code can be resolved by making the `Pet`'s owner a weak reference.

```swift
class Pet {
    weak var owner: Person?
}
```

And if the unit test is updated with this code, then one can observe with definitive proof that the strong reference cycle is broken and the memory leak is gone.

### Resolving Strong Reference Cycles with Unowned

`unowned` can be used to resolve strong reference cycles, but should only be used when the other reference has the same or longer lifetime. Again, this is because `unowned` is not nilled out when the instance is deallocated, and referencing it after the fact will result in a runtime error.

The previous example cannot use `unowned`, as the `Pet`'s owner was optional and `unowned` references are [defined using nonoptional types](https://developer.apple.com/library/content/documentation/Swift/Conceptual/Swift_Programming_Language/AutomaticReferenceCounting.html#//apple_ref/doc/uid/TP40014097-CH20-ID54). Instead, here's an example using `unowned`.

```swift
class State {
    var counties: [County]
}

class County {
    private unowned let state: State

    init(state: State) {
        self.state = state
    }
}
```

Using `unowned` has some improvements over `weak`. While there is is no strong reference cycle, the state property is both immutable and nonoptional.

#### Closures

Reference counting also applies to functions and closures, which are also reference types. Structures and enumerations are value types, not reference types, and are not stored and passed by reference. This means that both closures and functions are managed by ARC and can also leak memory if used without care.

#### Escaping

A closure can be escaping if a closure is passed as an argument to a function that returns _before_ the closure is called. If a closure is stored in a property, for instance, and is not called before the function returns then that is an escaping closure.

This is also a common source of strong reference cycles. So much in fact, that if a closure is marked with `@escaping`, then `self` must be explicitly used within the closure as a reminder to the developer to avoid the strong reference cycle.

```swift
var callbacks: [() -> ()] = []

func storeCallback(completionHandler: @escaping () -> ()) {
    callbacks.append(completionHandler)
}
```

#### Explicit vs Implicit Self

Closures require explicit self to make capture semantics explicit:

```swift
var block: () -> () = { }
var data ...

func saveBlock() {
    let innerClosure = {
        print(data)
    }
    block = innerClosure
}
```

This code results in a compiler error with the diagnostic: **Reference to property 'data' in closure requires explicit 'self.' to make capture semantics explicit**

Observe, instead, the following example:

```swift
var block: () -> () = { }
var data ...

func saveBlock() {
    func innerFunction() {
        print(data)
    }
    block = innerFunction
}
```

Here, there is no compiler error. Remember that **functions are reference types**, so the closure holding onto the function does in fact result in a strong reference cycle. Unfortunately, Swift does not warn about this error since only escaping closures require explicit self.

## Strong Reference Cycles By Example

There are two obvious scenarios that demonstrate strong reference cycles: referencing self within an owning closure of a class instance and strong delegates between class instances.

The example below demonstrates a strong reference cycle by capturing self strongly within a class instance that holds a strong reference to its closure.

```swift
class Example {
    var closure: () -> () = { }

    func captureSelf() {
        closure = { // [weak self] in
            _ = self
        }
    }
}
```

The strong reference cycle is easily resolved by using a [capture list](https://developer.apple.com/library/content/documentation/Swift/Conceptual/Swift_Programming_Language/AutomaticReferenceCounting.html#//apple_ref/doc/uid/TP40014097-CH20-ID56) to pass `self` weakly within the closure. Capture Lists can contain more than one object and can even rename the variables they refer to.

```swift
class Example {
    var closure: () -> () = { }

    func captureSelf() {
        closure = { [weak weakSelf = self] in
            _ = weakSelf
        }
    }
}
```

The example below demonstrates a strong reference cycle by capturing self strongly through delegates, or simply
put, strong references to objects that own one another.

```swift
protocol SomeDelegate: class {
}

class One: SomeDelegate {
    var two: Two?

    init() {
      two?.delegate = self
    }
}

class Two {
    /* weak */ var delegate: SomeDelegate?
}
```

In practice, delegates are typically made `weak` since they are usually optional and there are no guarantees about the lifetime of the delegate. It's important to make protocols that provide the interface for a delegate conform to `class` so that the reference can be made `weak`.

In the example below, the reference cycle is not as apparent since a capture list exists that captures `self` as a weak reference. However, the capture list only exists on the inner closure. Without the capture list on the `outerClosure`, `self` is passed strongly within the block. By the time `innerClosure` captures `self` weakly, it is too late. The only way to break the reference cycle in this example is to rely on an external collaborator to `nil` out the `outerClosure`--which is not okay!

```swift
class Example {
    var outerClosure: (() -> ())?

    func testCycle() {
        var innerClosure: (() -> ())?
        outerClosure = {
            innerClosure = { [weak self] in
                _ = self
            }
        }
    }
}

let example = Example()
example.testCycle() // Leak!
```

Let's modify the example to pass `self` in weakly to the outer closure, preventing the strong reference cycle.

```swift
class Example {
    var outerClosure: (() -> ())?

    func testCycle() {
        var innerClosure: (() -> ())?
        outerClosure = { [weak self] in
            innerClosure = {
                self?.callAFunction()
            }
        }
    }
}

let example = Example()
example.testCycle() // All good!
```

It might be tempting to use optional binding to `guard` against a `weak self`, especially if a function takes a non-optional parameter that is owned by self. Observe the following:

```swift
class Example {
    var outerClosure: (() -> ())?

    func testCycle() {
        var innerClosure: (() -> ())?
        outerClosure = { [weak self] in
          guard let `self` = self else { return }
            innerClosure = {
                self.callAFunction(withValue: self.value)
            }
        }
    }
}

let example = Example()
example.testCycle() // Leak!
```

Unfortunately, this introduces a strong reference cycle. Shadowing `self` is not the problem, instead, the optional binding with `guard let` unwraps the `weak self` as a strong reference, which is the default memory ownership in Swift. The solution here is to use another capture list in the `innerClosure` to pass the shadowed `self` weakly and optionally guard against the weak self for the same reasons as stated previously. Be careful not to abuse shadowed properties, especially in nested closures, as it can be confusing what `self` actually is.

```swift
class Example {
    var outerClosure: (() -> ())?

    func testCycle() {
        var innerClosure: (() -> ())?
        outerClosure = { [weak self] in
            guard let `self` = self else { return }
                innerClosure = { [weak self] in
                    guard let `self` = self else { return }
                    self.callAFunction(withValue: self.value)
                }
        }
    }
}

let example = Example()
example.testCycle() // All good!
```

Capture lists can also contain multiple arguments to improve readability. What's interesting about capture lists is that variables are captured at the time of creation. To learn more, Olivier Halligon has a [very thorough blog post](http://alisoftware.github.io/swift/closures/2016/07/25/closure-capture-1/) about the nuances of capture lists. Here, `value` is passed by value and allows the function to take a non-optional argument while removing the extraneous `guard` clauses.

```swift
func testCycle() {
    var innerClosure: (() -> ())?
    outerClosure = { [weak self] in
        guard let `self` = self else { return }
            innerClosure = { [weak self, value = self.value] in
                self?.callAFunction(withValue: value)
            }
    }
}
```

Let's again modify the first example to not reference self in the inner closure. Even though `self` is not used to read or write a property or call a method, there is still a strong reference cycle. The capture list passes `self` weakly to the `innerClosure` which means that `self` is implicitly captured strongly in the `outerClosure`. Thankfully, the compiler will warn against this with the diagnostic **Variable 'self' was written to, but never read**.

```swift
class Example {
    var outerClosure: (() -> ())?

    func testCycle() {
        var innerClosure: (() -> ())?
        outerClosure = {
            innerClosure = { [weak self] in

            }
        }
    }
}

let example = Example()
example.testCycle() // Leak!
```

## Functions Are Reference Types

Functions and closures are reference types in Swift. This is an important point to drive home, because it is very easy to cause strong reference cycles when passing functions as arguments. As of Swift 4.1, the compiler neither warns nor forces explicit capture semantics when referencing self in a function that is passed into an argument as a closure.

This situation is exacerbated in RxSwift, when passing functions into arguments.

```swift
class UserService {
    // ...

    func setupBindings() {
        let request = // ...
        serviceLayer
            .fetchData(from: request)
            .map(decodeUser)
            .subscribe(userSubject)
            .disposed(by: disposeBag)
    }

    func decodeUser(_ data: Data) throws -> User {
        return try JSONDecoder().decode(User.self, from: data)
    }
}
```

The aesthetics of passing the function into the closure parameter and thus omitting the curly braces is appealing. But the side effects come with a strong reference cycle, since `self` owns this function and functions are reference types.

There are several means to mitigate the reference cycle. A lesser appealing solution is to capture `self` in a capture list within the `map`.

```swift
serviceLayer
    .fetchData(from: request)
    .map { [unowned self] in self.decodeUser($0) }
    .subscribe(userSubject)
    // ...
```

Alternatively, since the function does not rely on internal state, it can be extracted into a "Type Method" such as a static function. Static functions are not owned by the class and as such prevent the strong reference cycle.

```swift
    // ...
        serviceLayer
            .fetchData(from: request)
            .map(UserService.decodeUser)
            .subscribe(userSubject)
            .disposed(by: disposeBag)
    }

    private static func decodeUser(_ data: Data) throws -> User {
        return try JSONDecoder().decode(User.self, from: data)
    }
```

Here's another subtle example of capturing implicit `self` strongly when passing a function as an argument. At a glance, the code appears to have no problems. The developer reading the code could very easily miss the strong reference cycle, especially if the programmer is _only_ looking for a weak capture list.

```swift
class Example {
    // ...

    func doStuff() {
        closure = { [weak self] in
            if let block = self?.notifyListeners {
                self?.performWithCompletion(block)
            }
        }
    }

    func notifyListeners() {
        self.listeners.forEach {
            $0.notify()
        }
    }

    func performWithCompletion(_ completion: @escaping () -> ()) {
        self.completion = completion
        // ...
    }
}
```

This contrived example isn't completely out of the ordinary, and yet the subtlety makes it especially concerning. In a previous example, optional binding was used to unwrap `weak self` into a temporary, strong reference. The optional binding in this example, `if let block = self?.notifyListeners {`, similarly creates a strong, temporary reference to the function `self.notifyListeners`. For extra subtlety, the function _looks_ like a variable since it is _assigned_ to a variable rather than _called_, as functions typically are.

For posterity, using a capture list with multiple, named arguments can also hide the issue.

```swift
func doStuff() {
    closure = { [weak self, block = self.notifyListeners] in
        self?.performWithCompletion(block)
    }
}
```

Instead of passing the function into the block as an argument, using an inline closure that calls the function will resolve the reference cycle, since `performWithCompletion` does not take an optional parameter.

```swift
func doStuff() {
    closure = { [weak self] in
        self?.performWithCompletion({
            self?.notifyListeners()
        })
    }
}
```

## URLSession, DispatchQueues, & Animation Blocks

The iOS SDK provides some block based APIs that use closures for a modern communication pattern. URLSession, DispatchQueues, and UIView block based animations provide APIs that take an escaping closure as a parameter to their function.

```swift
let task = URLSession.shared.dataTask(with: url, completionHandler: { data, _, _  in
    self.handleResult(data)
})
task.resume()

```

At a glance this appears to cause a strong reference cycle since there's no capture list that passes `self` weakly. In fact, there is no reference cycle in this example. `URLSession`'s `dataTask` does capture the `completionHandler`, but explicitly `nil`s out the property after completion of the response, and we can verify this assumption through a unit test.

```swift
let expectation = self.expectation(description: "")
weak var testObject: NetworkLayer?

autoreleasepool {
    let example = NetworkLayer()
    example.makeNetworkRequest(with: url, completion: {
        expectation.fulfill()
    })
    testObject = example
}

// the completion block is captured while the request is made
XCTAssertNotNil(testObject)

// the response completes
XCTWaiter().wait(for: [expectation], timeout: 10)

// URLSession internally releases the completion block
XCTAssertNil(testObject)
```

This test proves that the completion block is captured during the request and finally released after the response completes. This is an important side effect to know to properly handle lifetime specific code that we'll see an example of later on.

If a library author wants to parrot the implicitly released closure API that `URLSession` demonstrates, it is straightforward to do so.

```swift
var capturedClosure: ((Data) -> ())?

func doStuff(_ closure: @escaping (Data) -> ()) {
    self.capturedClosure = closure
    deferWork() // perform some long running task
}

private func deferWork() {
    let result = // perform work
    if let closure = self.capturedClosure {
        self.capturedClosure = nil
        closure(result)
    }
}
```

This is not guaranteed to prevent strong reference cycles, though, so use with caution. It is also very possible for `URLSession`'s `dataTask` to create a strong reference cycle, for instance.

```swift
class ServiceLayer {
    // ...
    private var task: URLSessionDataTask?

    func enqueueTask() {
        task = URLSession.shared.dataTask(with: url, completionHandler: { data, _, _  in
            self.handleResult(data)
        })
    }
}
```

Here, `enqueueTask` queues a `dataTask` but might never call `resume()` on the task. `resume()` is necessary since that triggers the request to perform and the completion handler will only be set to `nil` after the response completes. Since the `completionHandler` captures `self` strongly, this does create a strong reference cycle.

### DispatchQueue

The reverse of never using capture lists to resolve strong reference cycles is always using capture lists when there are no strong reference cycles.

`DispatchQueue`'s execution block does something similar to `URLSession`'s completion handler. Once the code block is executed, the escaping closure is released absolving the potential for a strong reference cycle. This is verifiable through another unit test.

```swift
class DispatchQueueExample {
    func captureSelfStrongly() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            _ = self
        }
    }
}

func test() {
    weak var testObject: DispatchQueueExample?

    autoreleasepool {
        let example = DispatchQueueExample()
        example.captureSelfStrongly()

        testObject = example
    }

    // self is still retained while the DispatchQueue's block waits to execute
    XCTAssertNotNil(testObject)

    // give the block enough time to fire
    RunLoop.current.run(until: Date().addingTimeInterval(0.1))

    // verify the execution block was released
    XCTAssertNil(testObject)
}
```

While this code doesn't cause strong reference cycles, it's not unusual to capture `self` weakly in a capture list, if the intent is to avoid unnecessary code execution when the class instance is out of scope. What's important is understanding the behavior rather than making guesses about when a capture list is required.

### Animation Blocks

Similarly to `DispatchQueue`s block handling, UIView's animation blocks' completion handlers are released after execution. This can also be verified through a unit test, using the same techniques as covered previously.

```swift
UIView.animate(withDuration: 10, animations: {
    self.frame = self.frame.insetBy(dx: -10, dy: -10)
}, completion: { _ in
    print("\(self.frame)")
})
```

When an animation block's code executes, the [animations are started immediately on another thread](https://developer.apple.com/library/content/documentation/WindowsViews/Conceptual/ViewPG_iPhoneOS/AnimatingViews/AnimatingViews.html#//apple_ref/doc/uid/TP40009503-CH6-SW4) to avoid blocking the current thread or the main thread, so a capture list in a UIView's animation closure does not have any practical benefits. Instead, the `completion` block does capture the closure until the execution completes which is where a capture list might be necessary.

## Conclusion

Developer Kevin Ballard [presented this scenario on the Swift Evolution mailing list](https://forums.swift.org/t/proposal-change-rules-for-implicit-captures-due-to-nested-closure-captures/316) several years ago (slightly modified from the original post):

```swift
class ServiceLayer {
    // ...
    private var task: URLSessionDataTask?

    func foo(url: URL) {
        task = URLSession.shared.dataTask(with: url) { data, response, error in
            let result = // process data
            DispatchQueue.main.async { [weak self] in
                self?.handleResult(result)
            }
        }
        task?.resume()
    }

    deinit {
        task?.cancel()
    }
}
```

An author of this code might expect that `self` is captured weakly in the data task, but it is not. Prior examples have shown that `self` is still implicitly captured strongly in the dataTask closure, so capturing `self` weakly in the dispatch queue closure will not give the _likely_ intended behavior here.

The author might have also intended to cancel the task on `deinit`, but that scenario can _never_ happen since `URLSession`'s `dataTask` is strongly capturing `self` within the `completionhandler`. This sort of behavior can be tricky and easily overlooked.

There can be many gotchas when taming capture semantics to avoid strong reference cycles or to abort early execution of a data task, for instance. There's no such thing as magic when you know the rules and intimately understand the underlying behavior. For more examples of strong reference cycles and a deep exploration into various patterns with closures, view the accompanying GitHub Repo at [github.com/marksands/SwiftMemoryByExample](https://github.com/marksands/SwiftMemoryByExample).
