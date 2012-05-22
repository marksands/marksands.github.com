---
layout: post
permalink: /2012/05/18/raii-rtti-rtfm.html
category : Programming
tags: [programming, C++]
---

# RAII, RTTI, RTFM

## RAII

RAII is __Resource Acquisition Is Initialization__, and it's a neat concept once you 
understand what it means and how it's used. RAII was born out of C++ and invented 
by its creator Bjarne Stroustrup.

In C++, the only code that can be guaranteed to be executed after an exception is 
thrown are the destructors of objects residing on the stack. Resource management 
needs to be tied to the lifespan of suitable objects in order to gain automatic 
allocation and reclamation. Resources are acquired during initialization, and 
guaranteed to be released with the destruction of the same objects.

For local objects allocated on the stack, the languages scoping rules ensure that 
the destructor is called when its scope ends. Thus, by putting the resource release 
logic in the destructor, C++'s scoping provides direct support for 
RAII[¹](http://en.wikipedia.org/wiki/Resource_Acquisition_Is_Initialization):

{% highlight c++ linenos %}
#include <iostream>
#include <chrono>

using namespace std::chrono;

class Timer {
  system_clock::time_point start, finish;
  public:
  Timer() {
    start = system_clock::now();
  }
  ~Timer() {
    finish = system_clock::now();
    nanoseconds ns = finish - start;
    std::cout << "Total time: "
      << ns.count() << " nanoseconds" << std::endl;
  }
};

int main() {
  Timer globalTimer;
  if(1)
    Timer localTimer;
}

// Total time: 0 nanoseconds
// Total time: 70000 nanoseconds
{% endhighlight %}

In this snippet, the Timer class demonstrates using RAII to calculate and display
the time it takes for a portion of code to execute. A `globalTimer` object is 
initialized in the first line of the main function, which will literally be used 
to calculate and display the global time the program took to execute. A `localTimer` 
object is initialized within the `if` statment's scope, so the duration of the 
execution only within the `if` statment will be cauclated and displayed by that object.
Since the `localTimer` object has a shorter lifespan, it will be displayed first 
followed by the `globalTimer`'s output.

### Smart Pointers

Consequently, this is how the C++11 library `shared_ptr` works. It is a reference
counting smart pointer that shares ownership, so when the last copy of it goes out
of scope it will free the managed object. In case you're wondering, `unique_ptr` and 
`shared_ptr` live in the header `<memory>`.
  
A smart pointer is a class that imitates raw pointers by overloading operators.
`unique_ptr` is powered by rvalue references, a C++11 feature. While it is not copyable,
it is movable. With `unique_ptr` and `shared_ptr`, `std::move` can be used as a 
helper function that moves its resources into a different object. The main difference
between `unique_ptr` and `shared_ptr` is that unique_ptr does not have shared-ownership,
meaning there is only one reference available at a time[²](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2011/n3242.pdf):

{% highlight c++ linenos %}
int main() {
  std::unique_ptr<int> p(new int(42));
  std::unique_ptr<int> p2 = std::move(p); // p is now empty
  std::cout << *p2;
}

// 42
{% endhighlight %}

One useful example of this is the `pimpl` idiom, where you have a pointer
to some class that implements all of its methods. This is useful for breaking 
out dependencies allowing your program to compile faster.

There is a smarter pointer available called `shared_ptr`, originally developed
for the Boost library but now part of the C++11 standard. `shared_ptr` objects 
have shared ownership, meaining the last remaining owner of the pointer is responsible 
for destroying the object, or otherwise releasing the resources associated with 
the stored pointer[³](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2011/n3242.pdf).

{% highlight c++ linenos %}
int main() {
  std::shared_ptr<int> sp(new int(42)); // ref count 1
  std::shard_ptr<int> sp2(sp)           // ref count 2
  std::cout << *sp << " " << *sp2;
}

// 42 42
{% endhighlight %}

### References

* [[1] RAII](http://en.wikipedia.org/wiki/Resource_Acquisition_Is_Initialization)
* [[2] unique_ptr/20.7.1](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2011/n3242.pdf)
* [[3] shared_ptr/20.7.2.2](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2011/n3242.pdf)