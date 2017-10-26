/*
 * This is a JavaScript Scratchpad.
 *
 * Enter some JavaScript, then Right Click or choose from the Execute Menu:
 * 1. Run to evaluate the selected text (Cmd-R),
 * 2. Inspect to bring up an Object Inspector on the result (Cmd-I), or,
 * 3. Display to insert the result in a comment after the selection. (Cmd-L)
 */

//
// Tag
//

console.log('test');

let htmlTag = (element) => {
  let that = {};

  //
  // Public
  //
  
  that.element = () => element;
  
  that.appendTag = (aTag) => {
    appendToElement(aTag.element());
    return that;
  }
  
  that.appendToTag = (aTag) => aTag.appendTag(that);
  
  that.append = (...children) => {
    for(var obj of children) {
      append(obj);
    }
    
    return that;
  }
  
  that.on = function (eventType, callback) {
    element.addEventListener(eventType, callback);
    return that;
  };
  
  that.off = function (eventType, callback) {
    element.removeEventListener(eventType, callback);
    return that;
  };

  // TODO: rename Jquery use it attr('tabindex', 3);
  that.attr = (object) => {
    Object.keys(object).forEach(key => that.setAttribute(key, object[key]));
    return that;
  };
  
  that.css = (key, value) => value === undefined ? 
    getComputedStyle(el)[key] : 
    element.style[key] = value;
  
  that.setAttribute = (key, value) => {
    if(typeof value === "function") {
      that.on(key, value);
    }
    else if (key === 'klass') {
      that.addClass(value);
    } else {
      element.setAttribute(key, value);
    }      
    
    return that;
  };
  
  that.getAttribute = (key) => element.getAttribute(key);
  
  that.addClass = (className) => {
    if (element.classList)
      element.classList.add(className);
    else
      element.className += ' ' + className;
    
    return that;
  };
  
  that.removeClass = (className) => {
    if (element.classList)
      element.classList.remove(className);
    else
      element.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    
    return that;
  };
  
  that.hasClass = (className) => {
    if (element.classList)
      element.classList.contains(className);
    else
      new RegExp('(^| )' + className + '( |$)', 'gi').test(element.className);
  }
  
  that.show = () => element.style.display = '';

  that.hide = () => element.style.display = 'none';
  
  that.offset = () => {
    var rect = element.getBoundingClientRect();
    
    return {
      top: rect.top + document.body.scrollTop,
      left: rect.left + document.body.scrollLeft
    };    
  };
  
  that.offsetParent = () => element.offsetParent || element;
  
  that.outerHeight = (includeMargin) => {
     var height = element.offsetHeight;
     if(!includeMargin) {
       return;
     }
    
    var style = getComputedStyle(element);
    height += parseInt(style.marginTop) + parseInt(style.marginBottom);
    return height;
  };
  
  that.outerWidth = (includeMargin) => {
     var width = element.offsetWidth;
     if(!includeMargin) {
       return width;
     }
    
    var style = getComputedStyle(el);
    width += parseInt(style.marginLeft) + parseInt(style.marginRight);
    return width;
  };
  
  that.position = () => ({left: el.offsetLeft, top: el.offsetTop});

  that.empty = () => element.innerHTML = '';
  
  that.remove = () => element.parentNode.removeChild(element);
  
  that.replaceWith = (el) => {
    let parent = element.parentNode;
    parent.removeChild(element);
    parent.appendChild(el);    
  }
  
  that.contains = (child) => element.contains(child);
  
  that.html = (value) => value === undefined ?
    element.innerHTML :
    element.innerHTML = value;
  
  that.text = (value) => value === undefined ? 
    element.textContent :
    element.textContent = value;
  
  that.find = (selector) => Array.prototype.map.call(element.querySelectorAll(selector), el => htmlTag(el));
  
  that.matches = (selector) => {
    var el = element;
    return (el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector).call(el, selector);
  };
  
  //
  // Private
  //
  
  let append = (object) => {
    if (typeof(object) === 'undefined' || object === null) {
      throw new Error('Can not append null or undefined to tag');
    }

    if (typeof object === "object" && object.constructor === Array) {
      for(var obj of object) {
        append(obj);
      }
    }
    else if (typeof object === "string") {
      appendString(object);
    } else if (typeof object === "function") {
      appendFunction(object);
    } else if (typeof object === "object" &&
      object.appendToTag /* eg. widget and tags implement appendToTag */) {
      object.appendToTag(that); // double dispatch
    }
    else if (typeof object === "object") {
      that.attr(object); // assume attributes if none of above
    } else {
      appendToElement(object);
    }  
  };

  let appendString = (str) => element.appendChild(document.createTextNode(str));
  
  let appendToElement = (childElement) => {
    if (element.canHaveChildren !== false) {
      element.appendChild(childElement);
    } else {
      element.text = element.text + childElement.innerHTML;
    }
  }
  
  let appendFunction = (fn) => fn(htmlBuilder(that));
    
  return Object.freeze(that);  
};

//
// Builder
//

let tags = ('a abbr acronym address area article aside audio b bdi bdo big ' +
            'blockquote body br button canvas caption cite code col colgroup command ' +
            'datalist dd del details dfn div dl dt em embed fieldset figcaption figure ' +
            'footer form frame frameset h1 h2 h3 h4 h5 h6 hr head header hgroup html i ' +
            'iframe img input ins kbd keygen label legend li link map mark meta meter ' +
            'nav noscript object ol optgroup option output p param pre progress q rp rt' +
            'ruby samp script section select small source span strong style sub summary' +
            'sup table tbody td textarea tfoot th thead time title tr track tt ul var' +
            'video wbr').split(' ');


let htmlBuilder = (rootElement) => {
  var root = htmlTag(getElement(rootElement));
  
  let that = {};
  
  that.root = () => root;
  
  that.tag = (tagName, ...children) => {
    var tag = htmlTag(createElement(tagName));
    tag.append(children);
    root.append(tag);
    return tag;
  }
  
  tags.forEach(tagName => {
    that[tagName] = (...children) => that.tag(tagName, children);
  });
  
  that.append = (...children) => {
    root.append(children);
    return that;
  }
  
  let createElement = (tagName) => document.createElement(tagName);

  function getElement (object) {
    // Create a fragment if no object
    if (typeof(object) === 'undefined' || object === null) {
      return  document.createDocumentFragment();
    }

    // If it's a tag
    if(object.element) {
      return object.element();
    }
    
    // a selector
    if (typeof object === "string") {
     return document.querySelectorAll(object).item(0);
    }

    // a Node List
    if (object.item) {
      return object.item(0);
    }
    
    // a jQuery
    if (object.get) {
      return object.get(0);
    }
    
    return object; // assume it's an element
  }
  
  return Object.freeze(that); 
};
//
// Tag
//

let htmlTag = (element) => {
  let that = {};

  //
  // Public
  //
  
  that.element = () => element;
  
  that.appendTag = (aTag) => {
    appendToElement(aTag.element());
    return that;
  }
  
  that.appendToTag = (aTag) => aTag.appendTag(that);
  
  that.append = (...children) => {
    for(var obj of children) {
      append(obj);
    }
    
    return that;
  }
  
  that.on = function (eventType, callback) {
    element.addEventListener(eventType, callback);
    return that;
  };
  
  that.off = function (eventType, callback) {
    element.removeEventListener(eventType, callback);
    return that;
  };

  // TODO: rename Jquery use it attr('tabindex', 3);
  that.attr = (object) => {
    Object.keys(object).forEach(key => that.setAttribute(key, object[key]));
    return that;
  };
  
  that.css = (key, value) => value === undefined ? 
    getComputedStyle(el)[key] : 
    element.style[key] = value;
  
  that.setAttribute = (key, value) => {
    if(typeof value === "function") {
      that.on(key, value);
    }
    else if (key === 'klass') {
      that.addClass(value);
    } else {
      element.setAttribute(key, value);
    }      
    
    return that;
  };
  
  that.getAttribute = (key) => element.getAttribute(key);
  
  that.addClass = (className) => {
    if (element.classList)
      element.classList.add(className);
    else
      element.className += ' ' + className;
    
    return that;
  };
  
  that.removeClass = (className) => {
    if (element.classList)
      element.classList.remove(className);
    else
      element.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    
    return that;
  };
  
  that.hasClass = (className) => {
    if (element.classList)
      element.classList.contains(className);
    else
      new RegExp('(^| )' + className + '( |$)', 'gi').test(element.className);
  }
  
  that.show = () => element.style.display = '';

  that.hide = () => element.style.display = 'none';
  
  that.offset = () => {
    var rect = element.getBoundingClientRect();
    
    return {
      top: rect.top + document.body.scrollTop,
      left: rect.left + document.body.scrollLeft
    };    
  };
  
  that.offsetParent = () => element.offsetParent || element;
  
  that.outerHeight = (includeMargin) => {
     var height = element.offsetHeight;
     if(!includeMargin) {
       return;
     }
    
    var style = getComputedStyle(element);
    height += parseInt(style.marginTop) + parseInt(style.marginBottom);
    return height;
  };
  
  that.outerWidth = (includeMargin) => {
     var width = element.offsetWidth;
     if(!includeMargin) {
       return width;
     }
    
    var style = getComputedStyle(el);
    width += parseInt(style.marginLeft) + parseInt(style.marginRight);
    return width;
  };
  
  that.position = () => ({left: el.offsetLeft, top: el.offsetTop});

  that.empty = () => element.innerHTML = '';
  
  that.remove = () => element.parentNode.removeChild(element);
  
  that.replaceWith = (el) => {
    let parent = element.parentNode;
    parent.removeChild(element);
    parent.appendChild(el);    
  }
  
  that.contains = (child) => element.contains(child);
  
  that.html = (value) => value === undefined ?
    element.innerHTML :
    element.innerHTML = value;
  
  that.text = (value) => value === undefined ? 
    element.textContent :
    element.textContent = value;
  
  that.find = (selector) => Array.prototype.map.call(element.querySelectorAll(selector), el => htmlTag(el));
  
  that.matches = (selector) => {
    var el = element;
    return (el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector).call(el, selector);
  };
  
  //
  // Private
  //
  
  let append = (object) => {
    if (typeof(object) === 'undefined' || object === null) {
      throw new Error('Can not append null or undefined to tag');
    }

    if (typeof object === "object" && object.constructor === Array) {
      for(var obj of object) {
        append(obj);
      }
    }
    else if (typeof object === "string") {
      appendString(object);
    } else if (typeof object === "function") {
      appendFunction(object);
    } else if (typeof object === "object" &&
      object.appendToTag /* eg. widget and tags implement appendToTag */) {
      object.appendToTag(that); // double dispatch
    }
    else if (typeof object === "object") {
      that.attr(object); // assume attributes if none of above
    } else {
      appendToElement(object);
    }  
  };

  let appendString = (str) => element.appendChild(document.createTextNode(str));
  
  let appendToElement = (childElement) => {
    if (element.canHaveChildren !== false) {
      element.appendChild(childElement);
    } else {
      element.text = element.text + childElement.innerHTML;
    }
  }
  
  let appendFunction = (fn) => fn(htmlBuilder(that));
    
  return Object.freeze(that);  
};

//
// Builder
//

let tags = ('a abbr acronym address area article aside audio b bdi bdo big ' +
            'blockquote body br button canvas caption cite code col colgroup command ' +
            'datalist dd del details dfn div dl dt em embed fieldset figcaption figure ' +
            'footer form frame frameset h1 h2 h3 h4 h5 h6 hr head header hgroup html i ' +
            'iframe img input ins kbd keygen label legend li link map mark meta meter ' +
            'nav noscript object ol optgroup option output p param pre progress q rp rt' +
            'ruby samp script section select small source span strong style sub summary' +
            'sup table tbody td textarea tfoot th thead time title tr track tt ul var' +
            'video wbr').split(' ');


let htmlBuilder = (rootElement) => {
  var root = htmlTag(getElement(rootElement));
  
  let that = {};
  
  that.root = () => root;
  
  that.tag = (tagName, ...children) => {
    var tag = htmlTag(createElement(tagName));
    tag.append(children);
    root.append(tag);
    return tag;
  }
  
  tags.forEach(tagName => {
    that[tagName] = (...children) => that.tag(tagName, children);
  });
  
  that.append = (...children) => {
    root.append(children);
    return that;
  }
  
  let createElement = (tagName) => document.createElement(tagName);

  function getElement (object) {
    // Create a fragment if no object
    if (typeof(object) === 'undefined' || object === null) {
      return  document.createDocumentFragment();
    }

    // If it's a tag
    if(object.element) {
      return object.element();
    }
    
    // a selector
    if (typeof object === "string") {
     return document.querySelectorAll(object).item(0);
    }

    // a Node List
    if (object.item) {
      return object.item(0);
    }
    
    // a jQuery
    if (object.get) {
      return object.get(0);
    }
    
    return object; // assume it's an element
  }
  
  return Object.freeze(that); 
};















let idGenerator = (() => {
  var id = 0;

  return () => {
    id += 1;
    return id.toString();
  };
})();


let counterWidget = () => {
  let that = {};
  let count = 0;
  
  that.appendTo = (element) => that.renderOn(htmlBuilder(element));
  
  that.renderOn = (html) => html.div({id: 'counter'}, that.renderContentOn);

  that.renderContentOn = (html) => {
    html.span('' + count);
    html.button({click: () => { count++; that.update();}}, '+');
    html.button({click: () => { count--; that.update();}}, '-')
  };
  
  that.update = () => {
    let rootElement = document.querySelector('#counter');
    var html = htmlBuilder(rootElement);
    html.root().empty();
    that.renderContentOn(html);
  };

  return Object.freeze(that);
};


let widget = ({id, content}) => {
  id = id || 'widget' + idGenerator()
  content = content || ((html) => {});
  
  let that = {};
  
  that.id = () => id;
  
  that.rootElement = () => document.querySelector('#' + that.id());
  
  that.root = () => htmlTag(that.rootElement());
  
  that.isAttached = () => that.rootElement() !== null;
  
  that.appendTo = (element) => that.renderOn(htmlBuilder(element));
  
  that.appendToTag = (tag) => that.renderOn(htmlBuilder(tag));
  
  that.replace = (element) => {
    var html = htmlBuilder(element);
    html.root.empty();
    renderOn(canvas);
  };
  
  that.renderRootOn = (html) => html.tag('widget').attr({id: id});
  
  that.renderOn = (html) => that.renderRootOn(html).append(content);
  
  
  that.update = () => {
    if (!that.isAttached()) {
      return;
    }

    // Re-render
    var html = htmlBuilder();
    that.renderOn(html);

    // Replace our self
    that.root().replaceWith(html.root().element());
  };

  return Object.freeze(that);
};


let counter2Widget = () => {
  let that = Object.assign({}, widget({content: (html) => that.renderContentOn(html)}));
  let count = 0;
  
  that.renderContentOn = (html) => {
    html.span('' + count);
    html.button({click: () => { count++; that.update();}}, '+');
    html.button({click: () => { count--; that.update();}}, '-')
  };
  

  return Object.freeze(that);
};



let bodyElement = document.querySelector('BODY');
bodyElement.innerHTML = '';

counter2Widget().appendTo(bodyElement)






