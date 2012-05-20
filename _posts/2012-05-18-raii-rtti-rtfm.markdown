---
layout: post
permalink: /2012/05/18/raii-rtti-rtfm.html
category :
- Programming
- C++
---

# RAII, RTTI, RTFM - Tips For C++ Beginners

### RAII

RAII is Resource Aquisition Is Initialization, and it's a neat concept once you 
understand what it means and how it's used. RAII was born out of C++ and invented 
by its creator Bjarne Stroustrup.

In C++, the only code that can be guaranteed to be executed after an excpetion is 
thrown are the destrucors of objects residing on the stack. Resource management 
needs to be tied to the lifespan of suitable objects in order to gain automatic 
allocation and reclamation. Resources are acquired during initializatoin, and 
gauranteed to be released with the destruction of the same objects.

For local objects allocated on the stack, the langauges scoping rules ensure that 
the destructor is called when its scope ends. Thus, by putting the resource release 
logic in the destructor, C++'s scoping provides direct support for RAII. This is 
best explained by an example:

    class Timer {
      clock_t start, finish;
      public:
      Timer() { start = clock(); }
      ~Timer() { finish = clock();
        std::cout << "Total time: "
          << ((double)(finish - start)/CLOCKS_PER_SEC)
          << std::endl;
      }
    };

    int main () {
      Timer globalTimer;
  
      if(1)
        Timer localTimer;
    }

    // Total time: 1e-06
    // Total time: 3.8e-05

In this snippet, the Timer class demonstrates using RAII to calculate and display
the time it takes for a portion of code to execute. A `globalTimer` object is 
initialized in the first line of the main function, which will literally be used 
to calculate and display the global time the program took to execute. A `localTimer` 
object is initialized within the `if` statment's scope, so the duration of the 
execution only within the if statment will be cauclated and displayed by that object.