// 100 dates
var y =
[

new Date(2002, 7, 1),
new Date(2002, 8, 1),
new Date(2002, 9, 1),
new Date(2002, 10, 1),
new Date(2002, 11, 1),

new Date(2003, 0, 1),
new Date(2003, 1, 1),
new Date(2003, 2, 1),
new Date(2003, 3, 1),
new Date(2003, 4, 1),
new Date(2003, 5, 1),
new Date(2003, 6, 1),
new Date(2003, 7, 1),
new Date(2003, 8, 1),
new Date(2003, 9, 1),
new Date(2003, 10, 1),
new Date(2003, 11, 1),

new Date(2004, 0, 1),
new Date(2004, 1, 1),
new Date(2004, 2, 1),
new Date(2004, 3, 1),
new Date(2004, 4, 1),
new Date(2004, 5, 1),
new Date(2004, 6, 1),
new Date(2004, 7, 1),
new Date(2004, 8, 1),
new Date(2004, 9, 1),
new Date(2004, 10, 1),
new Date(2004, 11, 1),

new Date(2005, 0, 1),
new Date(2005, 1, 1),
new Date(2005, 2, 1),
new Date(2005, 3, 1),
new Date(2005, 4, 1),
new Date(2005, 5, 1),
new Date(2005, 6, 1),
new Date(2005, 7, 1),
new Date(2005, 8, 1),
new Date(2005, 9, 1),
new Date(2005, 10, 1),
new Date(2005, 11, 1),

new Date(2006, 0, 1),
new Date(2006, 1, 1),
new Date(2006, 2, 1),
new Date(2006, 3, 1),
new Date(2006, 4, 1),
new Date(2006, 5, 1),
new Date(2006, 6, 1),
new Date(2006, 7, 1),
new Date(2006, 8, 1),
new Date(2006, 9, 1),
new Date(2006, 10, 1),
new Date(2006, 11, 1),

new Date(2007, 0, 1),
new Date(2007, 1, 1),
new Date(2007, 2, 1),
new Date(2007, 3, 1),
new Date(2007, 4, 1),
new Date(2007, 5, 1),
new Date(2007, 6, 1),
new Date(2007, 7, 1),
new Date(2007, 8, 1),
new Date(2007, 9, 1),
new Date(2007, 10, 1),
new Date(2007, 11, 1),

new Date(2008, 0, 1),
new Date(2008, 1, 1),
new Date(2008, 2, 1),
new Date(2008, 3, 1),
new Date(2008, 4, 1),
new Date(2008, 5, 1),
new Date(2008, 6, 1),
new Date(2008, 7, 1),
new Date(2008, 8, 1),
new Date(2008, 9, 1),
new Date(2008, 10, 1),
new Date(2008, 11, 1),

new Date(2009, 0, 1),
new Date(2009, 1, 1),
new Date(2009, 2, 1),
new Date(2009, 3, 1),
new Date(2009, 4, 1),
new Date(2009, 5, 1),
new Date(2009, 6, 1),
new Date(2009, 7, 1),
new Date(2009, 8, 1),
new Date(2009, 9, 1),
new Date(2009, 10, 1),
new Date(2009, 11, 1),

new Date(2010, 0, 1),
new Date(2010, 1, 1),
new Date(2010, 2, 1),
new Date(2010, 3, 1),
new Date(2010, 4, 1),
new Date(2010, 5, 1),
new Date(2010, 6, 1),
new Date(2010, 7, 1),
new Date(2010, 8, 1),
new Date(2010, 9, 1),
new Date(2010, 10, 1)

]


// 100 ms
var m = [104,609,274,177,61,108,181,174,141,63,55,182,84,161,145,104,24,96,79,61,59,11,63,62,81,125,137,186,85,159,387,224,137,95,125,211,187,245,195,133,63,166,185,226,227,135,113,47,160,134,98,111,85,132,291,135,168,12,0,0,74,318,160,117,62,77,165,79,57,21,40,52,57,142,121,92,123,83,133,124,147,75,42,93,35,114,50,38,24,15,26,44,40,11,15,5,15,57,12,7];

var start = new Date(2002, 7, 1);
var year = 1000 * 60 * 60 * 24 * 365;
var itr = -1;
var data = pv.range(0, 10, .1).map(function(x) {
  itr++;
    return {
      x: y[itr],
      y: m[itr]
    };
});
var end = data[data.length - 1].x;