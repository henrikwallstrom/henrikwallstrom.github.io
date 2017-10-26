---
layout:     post
title:      Lets build a JS-Framework from Scratch
date:       2015-12-01 19:12:00
summary:    Lets build a JS-Framework from Scratch
categories: es6
---

In 2011 we decided to build our own JS-framework, [WIDGET-JS](https://github.com/foretagsplatsen/widgetjs). I would probably not have done that today with all     options available.

But it is not that complicated to do and it would be interesting to re-do it in ES6/ES20015. Let´s reimplement the core of Widget-JS for fun!

We want to be able to write code like this:

{% highlight javascript lineanchors %}
html.h2('Todo')
html.ul(
  todos.map(todo => html.li(
    html.checkbox({ 
      checked : todo.isDone(), 
      click: () => todo.complete() }),
    html.span(todo.description())
  )
)
{% endhighlight %}

My post is more or less a transcript on how to get to this result: [https://gist.github.com/henrikwallstrom/12669c3865c9b90f07b3](https://gist.github.com/henrikwallstrom/12669c3865c9b90f07b3).

## ES6/ES2015
ES20015 features we will use:

  * **Let declarations** for block scoped variables. 
    ```let x = {}```

  * **Destructuring assignment** for eg. assignments
    ```let { width, height } = getDimensions()``` and function parameters 
    ```function fun({name, age})```

  * **Spread syntax** for functions that take multiple arguments when we have eg. an array. 
    ```fun(...someArray);```

  * **Rest parameters** for variable number of arguments to functions. 
    ```function fun(id, …args) {}```

  * **Arrow functions** 
    ```(a, b) => a + b```

<span class='yellow-highlight'>
We will not use the new class syntax mainly because of personal taste and that it still have issues with how “this” is bound.</span> Instead we will use factory functions and closures.
If you are interested in why people consider the new classes bad go to eg. [https://github.com/joshburgess/not-awesome-es6-classes](https://github.com/joshburgess/not-awesome-es6-classes)

## Rendering DSL
Lets start with a `htmlBuilder`. Maybe it should be named `domBuilder` since we will not generate HTML. We will append DOM elements.

{% highlight javascript lineanchors %}
const htmlBuilder = (rootElement) => {
 let that = {};
 
 that.tag = (tagName) => {
    var tag = createElement(tagName);
    rootElement.appendChild(tag);
 };
 
 let createElement = (tagName) => 
    document.createElement(tagName);
 
 return Object.freeze(that); 
};
{% endhighlight %}

Our builder take a `rootElement` as argument and appends child nodes to it from tag names. Now we can create tags like this:

{% highlight javascript lineanchors %}
let html = htmlBuilder(document.querySelector(‘BODY’))
html.tag(‘HR’);
html.tag(‘BR’);
{% endhighlight %}

Wohoo!! We can create horizontal rulers, forced line-breaks and tags that don’t need children or attributes. Maybe not that awesome?
We need to be able to nest elements:

{% highlight javascript lineanchors %}
html.tag(‘H1’, 
  html.tag(‘span’, ‘Hello’), 
  ‘ world’
);
{% endhighlight %}


Let’s create a `htmlTag` for that. Our `htmlTag? will wrap a DOM element and expose methods to append children or mutate the element.

{% highlight javascript lineanchors %}
const htmlTag = (element) => {
 let that = {};
 
 that.element = () => element;
 
 that.appendTag = (aTag) => {
   appendToElement(aTag.element());
   return that;
 }
  
 that.appendToTag = (aTag) => aTag.appendTag(that);
 
 that.append = (…children) => {
   for(var obj of children) {
     append(obj);
   } 
   return that;
 };

 let append = (object) => {
   if (typeof object === “string”) {
      appendString(object);
   } else if (typeof object === “object” &&
     object.appendToTag) {
     object.appendToTag(that); // double dispatch
   } else {
     appendToElement(object);
   } 
 };
 
 let appendString = (str) =>
   element.appendChild(document.createTextNode(str));
 
 let appendToElement = (childElement) => {
   if (element.canHaveChildren !== false) {
     element.appendChild(childElement);
   } else {
     element.text = element.text + childElement.innerHTML;
   }
 }
 
 return Object.freeze(that);
};
{% endhighlight %}

We now have a tag that we can append text, elements and other tags on. Also anything that implements the `appendToTag` interface. Let’s update our builder to use tags:

{% highlight javascript lineanchors %}
const htmlBuilder = (rootElement) => {
 let that = {};
 
 let root = htmlTag(rootElement);
 
 that.tag = (tagName, …children) => {
   var tag = htmlTag(createElement(tagName));
   tag.append(…children)
   root.append(tag);
   return tag;
 }
 
 let createElement = (tagName) => 
    document.createElement(tagName);
 
 return Object.freeze(that); 
};
{% endhighlight %}

We can now nest tags:

{% highlight javascript lineanchors %}
html.tag(‘H1’, 
  html.tag(‘span’, ‘Hello’), 
  ‘ world’
);
{% endhighlight %}

It is starting to look like our rendering DSL. But we want to write `html.h1()` instead of `html.tag(‘h1’)`. So lets define all the common tags:

{% highlight javascript lineanchors %}
const tags = ('a abbr acronym address area wbr' +
 ... all the other tags 
).split(' ');
{% endhighlight %}

And add them to our builder:

{% highlight javascript lineanchors %}
const htmlBuilder = (rootElement) => {
 ....
 tags.forEach(tagName => {
   that[tagName] = (…children) => 
    that.tag(tagName, …children);
 });
 ... 
};
{% endhighlight %}

And now we have our Rendering DSL.

{% highlight javascript lineanchors %}
html.h1(
  html.span(‘Hello’), 
  ‘ world’
);
{% endhighlight %}

But we need to be able to add attributes, eg. by allowing an object with key/values to be passed as an argument like this: 

{% highlight javascript lineanchors %}
html.h1(
  html.span({style: ‘background-color: yellow’},’Hello’),
  ‘ world’
);
{% endhighlight %}


We can do that by assuming an object without `appendToTag` to hold attributes:

{% highlight javascript lineanchors %}
} else if (typeof object === “object”) {
  that.attr(object); // assume attributes if none of above
} else {
{% endhighlight %}

And add a `that.attr` that set attributes for all key/value-pairs:

{% highlight javascript lineanchors %}
that.attr = (object) => {
  Object.keys(object).forEach(key => 
element.setAttribute(key, object[key]));
  return that;
};
{% endhighlight %}

Voila!

{% highlight javascript lineanchors %}
html.h1(
  html.span({style: ‘background-color: yellow’},’Hello’),
  ‘ world’
);
{% endhighlight %}

Let´s attach functions!

{% highlight javascript lineanchors %}
that.attr = (object) => {
  Object.keys(object).forEach(key => {
    if(typeof object[key] === “function”) {
      that.on(key, object[key]);
    } else {
      element.setAttribute(key, object[key]);
    }
  });
  return that;
};

that.on = function (eventType, callback) {
  element.addEventListener(eventType, callback);
  return that;
};
{% endhighlight %}

Now we can listen for eg. clicks

{% highlight javascript lineanchors %}
html.h1({click: () => alert(‘HEY!’)}, 
  html.span({style: ‘background-color: yellow’},’Hello’), 
  ‘ world’
);
{% endhighlight %}

## jQuery or no jQuery

It’s easy to add support for jQuery. Just add one line to htmlTag:

{% highlight javascript lineanchors %}
that.asJQuery = () => jQuery(element);
{% endhighlight %}

Use it like:

{% highlight javascript lineanchors %}
let name = html.tag(‘input’);
html.button({click: () => 
    alert(‘HEY ‘ + name.asJQuery().val())}, 
    ‘Click’);
{% endhighlight %}

But you don’t like jQuery? You might not need it [http://youmightnotneedjquery.com/ ](http://youmightnotneedjquery.com/ )

Just add what you need to `htmlTag`

{% highlight javascript lineanchors %}
that.show = () => element.style.display = ‘’;
that.hide = () => element.style.display = ‘none’;
that.empty = () => element.innerHTML = ‘’;
that.remove = () => element.parentNode.removeChild(element);
that.html = (value) => value === undefined ?
 element.innerHTML :
 element.innerHTML = value;
that.text = (value) => value === undefined ? 
 element.textContent :
 element.textContent = value;
{% endhighlight %}


## Stateful components aka widgets
We already have what we need to create a stateful component that keep its state and re-render itself when state change.
Eg. this counter widget with two buttons to increase/decrease the count 

{% highlight javascript lineanchors %}
let counterWidget = () => {
 let that = {};
 let count = 0;
 let id = 'counter';
 
 // Render a wrapper
 that.renderOn = (html) => html.div({id: id},
   that.renderContentOn);

 // and render some content in the wrapper
 that.renderContentOn = (html) => {
   html.span(‘’ + count);
   html.button({click: () => 
    { count++; that.update();}}, ‘+’);
   html.button({click: () => 
    { count — ; that.update();}}, ‘-’)
 };
 
 that.update = () => {
   // re-render content and replace wrapper
   let rootElement = document.querySelector(‘#’ + id);
   var html = htmlBuilder(rootElement);
   html.root().empty();
   that.renderContentOn(html);
 };
 
{% endhighlight %}

And we have a reusable counter widget that we can create instances of like this:

{% highlight javascript lineanchors %}

// create instance of our counter
var counter = counterWidget(); 

// render on BODY
let bodyElement = document.querySelector('BODY');
counter.appendTo(htmlBuilder(element));
{% endhighlight %}


But we don't want to write all of that boilerplate code for every widget. Let’s extract the update mechanism and common code into a widget class:

{% highlight javascript lineanchors %}
let widget = ({id, content, root}) => {
 id = id || ‘widget’ + idGenerator()
 content = content || ((html) => {});
 
 let that = {};
 
 that.id = () => id;
 
 that.rootElement = () => 
    document.querySelector(‘#’ + that.id());
 
 that.root = () => htmlTag(that.rootElement());
 
 that.isAttached = () => that.rootElement() !== null;
 
 that.appendTo = (element) => 
    that.renderOn(htmlBuilder(element));
 
 that.appendToTag = (tag) => 
    that.renderOn(htmlBuilder(tag));
 
 that.replace = (element) => {
   var html = htmlBuilder(element);
   html.root.empty();
   renderOn(canvas);
 };
 
 that.renderRootOn = (html) => 
    html.tag(‘widget’).attr({id: id});
 
 that.renderOn = (html) => 
    that.renderRootOn(html)
    .append(content);
 
 that.update = () => {
    if (!that.isAttached()) {
        return;
    }

    // Re-render
    var html = htmlBuilder();
    that.renderOn(html);
    return that;
  };

  return that;
};
{% endhighlight %}

Now we can write our counter widget as:

{% highlight javascript lineanchors %}

let counterWidget = () => {
  let that = widget({});
  let count = 0;
 
  that.renderContentOn = (html) => {
    html.span(‘’ + count);
    html.button({click: () => 
        { count++; that.update();}}, ‘+’);
    html.button({click: () => 
        { count — ; that.update();}}, ‘-’)
  };

  return Object.freeze(that);
};
{% endhighlight %}

## Composable components
Reusing and composing widgets gives us the real power. Since widget have the method `that.appendToTag` widgets can be appended to tags.

{% highlight javascript lineanchors %}
let widget = ({id, content, root}) => {
  ...
 that.appendToTag = (tag) => that.renderOn(htmlBuilder(tag));
  ...
};
{% endhighlight %}


Eg. to make an unordered list of users we do:

{% highlight javascript lineanchors %}
html.ul(
  users.map(user => html.li(userWidget(user)))
);
{% endhighlight %}

## ES6 or not?
I wish JavaScript would have had all of these nice ES6 features from the start. It make the code a lot more compact and clean. 
But I’m not sure it is worth the extra transpile step. I think we will wait until mainstream browsers support ES6 fully. Then we still need transpillation for older browsers but can develop without transpilation.

I doubt anyone will read all of this. If you did why not leave a comment as well :)
