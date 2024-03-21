define(function(require,exports,module){var _=require("thirdparty/lodash"),Async=require("utils/Async");function _detectTransitionEvent(){var event,el=window.document.createElement("fakeelement"),transitions={OTransition:"oTransitionEnd",MozTransition:"transitionend",WebkitTransition:"webkitTransitionEnd",transition:"transitionend"};return _.forEach(transitions,function(value,key){void 0!==el.style[key]&&(event=value)}),event}var _transitionEvent=_detectTransitionEvent();function animateUsingClass(target,animClass,timeoutDuration){var result=new $.Deferred,$target=$(target);function finish(e){e.target===target&&result.resolve()}function cleanup(){$target.removeClass(animClass).off(_transitionEvent,finish)}return timeoutDuration=timeoutDuration||400,$target.is(":hidden")?result.resolve():$target.addClass(animClass).on(_transitionEvent,finish),Async.withTimeout(result.promise(),timeoutDuration,!0).done(cleanup)}exports.animateUsingClass=animateUsingClass});
//# sourceMappingURL=AnimationUtils.js.map