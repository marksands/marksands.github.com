---
layout: post
permalink: /2015/1/2/reacting-to-reactive-cocoa-part-ii.html
title: Reacting to Reactive Cocoa Part II
category : Programming
tags: [programming, Objective-C, reactive cocoa]
comments: true
showads: true
---

### Baby's First Monad

Since this is an app designed to pull down recent showtime listings from the Internet¹, I realized I'd need a network request in order to fetch the data and populate a listing of showtimes. In this case, a simple array to populate a tableview with the movies that are playing for each theater. I didn't want to waste time building the entire API before digging into the app, so I spun up a dummy heroku instance to return some hard coded values. At this point, my muscle memory is nearly wired to pull in something like AFNetworking and start making GET requests. Before I knew it, I had a podfile and a view model ready to go; but quickly realized that I'm supposed to be doing this the Reactive Cocoa way.

<!-- more -->

Without much searching around, I decided to place my best foot forward and see how far I could get without tripping. From what I've seen in the past, the macro `RAC` will magically populate an object with data by assigning it to something called a `RACSignal`. So that's where I began: `RAC(self, movies) = [self fetchMoviesSignal];` Now I just needed to see what this `fetchMoviesSignal` entailed.

### RACSignal

`RACSignal` appears to be the workhorse of reactive cocoa. When inspecting the headers, we're told that `RACSignal` inherits from `RACStream`, which is _a class that represents a monad, upon which many stream-based operations can be built_ (it looks complicated, so I closed the header to regain my attention).

Since I already had AFNetworking imported, I decided to expirment with wrapping it in a new signal object. As it turns out, it was fairly straightforward. This is what I ended up with:

```objc
- (RACSignal *)fetchMoviesSignal {
    return [RACSignal createSignal:^RACDisposable *(id<RACSubscriber> subscriber) {
        [[AFHTTPRequestOperationManager manager] GET:@"movieapi.com/showtimes" parameters:nil success:^(AFHTTPRequestOperation *operation, id responseObject) {
            [subscriber sendNext:responseObject];
            [subscriber sendCompleted];
        } failure:^(AFHTTPRequestOperation *operation, NSError *error) {
            [subscriber sendError:error];
        }];
        return nil;
    }];
}
```

Before I got here, I had to ask myself what a subscriber was. The documentation for the subscriber states that it _represents any object which can directly receive values from a RACSignal_. The header file for the `RACSubscriber` protocol was actually very informative.[²](https://github.com/ReactiveCocoa/ReactiveCocoa/blob/a6bc3a918de10c0310f10185fd5eca72d285742c/ReactiveCocoa/RACSubscriber.h) `sendNext:`, `sendCompleted`, and `sendError:` all made perfect sense to me at the time. When I built and ran, and saw that my movies array was populated with the JSON response from the GET request, I felt all warm and fuzzy.

Even though I didn't accomplish much, I took quite some time before arriving at this. I did a lot of reading the header files and other blog posts I came across to make sure I wasn't way off track. I think next time I will try to bite off a little more and see what all I can accomplish in the UI. I'll need to populate my table with the showtimes and movie posters, so it sounds like I have my work cut out for me yet!

### References

* [[1] Reacting to Reactive Cocoa Part I](marksands.github.io/2014/12/30/reacting-to-reactive-cocoa-part-i.html)
* [[2] RACSubscriber.h](https://github.com/ReactiveCocoa/ReactiveCocoa/blob/a6bc3a918de10c0310f10185fd5eca72d285742c/ReactiveCocoa/RACSubscriber.h)
