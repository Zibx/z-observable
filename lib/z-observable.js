/**
 * Created by Ivan on 10/19/2014.
 */

module.exports = (function(){
    'use strict';
    try{
        var Z = require( 'z-lib' );
    }catch(e){
        var Z = {};
    }

    var slice = Array.prototype.slice;
    /*
    Compile subscribers to a single function
     */

    var Remover = function(eventName, fn, parent){
        this.eventName = eventName;
        this.fn = fn;
        this.parent = parent;
    };
    Remover.prototype.remove = function(){
        this.parent.un(this.eventName, this.fn);
    };
    Remover.prototype.eventName = '';
    Remover.prototype.fn = function(){};
    Remover.prototype.parent = {};


    var eventBuilder = function( el, scope ){
        var out = [scope],
            txt = [], names = [], counter = 0, fireFn;
        el.list.forEach(function( el ){
            out.push( el.fn, el.caller );
            names.push( 'f'+ counter, 'c'+ counter );
            txt.push('f'+ counter +'.apply('+ 'c'+ counter + ', (data[dataLength] = c'+ counter+') && data) === false');
            counter++;
        });
        names.push('data');
        !el.plain && txt.reverse();
        fireFn = new Function(
            names.join(','),
            'var dataLength = data.length;return (' + txt.join('||')+')? false : this;'
        );
        el.fn = fireFn.bind.apply(fireFn, out);
    };

    var proto = {
        /*
         Function: _init
         Runs in class init. Adds uniq `eventList` object to class

         */
        _init: function(){
            this.eventList = {};//this._EventList ? new this._EventList().eventList : {};
            this.on(this.listeners);
        },
        /*_initPrototype: function(  ){
            var tmp = function(){ this.eventList = {}; };
            tmp.prototype = proto;

            this._EventList = function(){};
            this._EventList.prototype = { eventList: (new tmp()).on( this.listeners ).eventList };
        },*/
        /*
         Function: fireEvent (fire)
         Fires an event



         Parameters:
         eventName - name of event
         args[ 1 .. inf ] - arguments to event callbacks

         */
        fireEvent : function fire( eventName ) {

            var data, i,
                event = this.eventList[ eventName ],
                allEvents = this.eventList[ '*' ],
                prevented,
                fn;

            allEvents && allEvents.fn.apply(allEvents, arguments);

            if( event ) {

                // copy args to data.
                data = new Array(i = arguments.length - 1);
                while(i--)
                    data[i] = arguments[i+1];

                return event.fn(data);
            }else{
                prevented = false;
                if( this.listeners && this.listeners[ eventName ] ){
                    fn = this.listeners[ eventName ];
                    var subscriber, dataLength = data.length;

                    data = new Array(i = arguments.length - 1);
                    while(i--)
                        data[i] = arguments[i+1];

                    data[ dataLength ] = subscriber.caller;
                    prevented = fn.apply( this, data ) === false;
                }
            }

            return prevented ? false : this;
        },
        /* When you don't want this event to be fired too frequently.
           But it still would be fired on first call and last call would be done as well.*/
        fireSchedule: function( interval, eventName ){
            var eventList = this.eventList,
                event = eventList[ eventName ],
                date, nextCall;
            if( !event )
                return;

            nextCall = event.nextCall;

            date = (new Date()).valueOf();
            event.args = slice.call( arguments, 1 );
            if( !nextCall || nextCall <= date ){
                event.nextCall = date + interval;
                this.fire.apply( this, event.args );
            }else if( nextCall > date ){
                if( event.timeout )
                    return;
                event.timeout = setTimeout(function(){
                    event.timeout = void 0;
                    event.nextCall = date + interval;
                    this.fire.apply( this, event.args );
                }.bind(this), interval + 2 );
            }
        },

        /*
         Function: on

         Subscribe callback on event

         Parameters:
         eventName - name of event
         fn - callback function
         [ caller = this ] - scope to call on ( default: this )

         */
        on : function on( eventName, fn, caller ) {
            var i, _i;
            if( typeof eventName !== 'string' ){ // object of events
                for( i in eventName ){
                    if( eventName.hasOwnProperty( i ) )
                        this.on( i, eventName[ i ] );
                }
            }else{
                if( eventName.indexOf(',') > -1 ){
                    var tokens = eventName.split(',');

                    for( i = 0, _i = tokens.length; i < _i; i++){
                        this.on( tokens[i].trim(), fn, caller )
                    }
                }else{
                    var eventList = this.eventList || (this.eventList = {}),
                        data = {fn : fn, caller : caller || this };

                    (eventList[eventName] || ( eventList[eventName] = { list: [] } )).list.push( data );
                    eventList[eventName] = { list: eventList[eventName].list.slice() };
                    if( eventList[eventName].list.length > 10 ){
                        console.warn('Strange event `'+ eventName +'`, ' + eventList[ eventName ].length + ' handlers attached');
                    }/*/debug cut*/
                    eventBuilder( eventList[eventName], this );
                }
            }
            return this;
        },

        removableOn: function(eventName, fn, caller){
            this.on( eventName, fn, this );
            return new Remover(eventName, fn, this)
        },
        removableOnce: function(eventName, fn, caller){
            var wrap = function(){
                fn.apply(caller, arguments);
                remover.remove();
            };

            var remover = new Remover(eventName, wrap, this);
            this.on( eventName, wrap, caller || this );
            return remover;
        },

        once: function( name, fn, scope ){
            var wrap = function(){
                fn.apply(scope, arguments);
                this.un(name, wrap);
            };
            this.on( name, wrap, this );
        },
        /*removableOn: function( eventName, fn, caller ){
            var wrap = function(){
                fn.apply(caller, arguments);
            },
                _self = this;
            this.on( eventName, wrap, this );

            return {remove: function(  ){
                _self.un(eventName, wrap);
            }};

        },*/
        /*
         Function: un

         Unsubscribe callback for event. It's important that fn shoul be same function pointer, that was pased in <on>

         Parameters:
         eventName - name of event
         fn - callback function

         */
        un : function un( eventName, fn ){
            var event,
                i, _i, eventList;


            if( typeof eventName !== 'string' ){ // object of events
                for( i in eventName ){
                    if( eventName.hasOwnProperty( i ) ){
                        this.un( i, eventName[i] );
                    }
                }
            }else{
                if( eventName.indexOf( ',' ) > -1 ){
                    var splitted = eventName.split( ',' );
                    for( i = 0, _i = splitted.length; i < _i; i++ ){
                        this.un( splitted[i].trim(), fn );
                    }
                }else{
                    event = this.eventList[ eventName ];
                    if( event !== void 0 ){
                        if( fn === void 0 ){
                            delete this.eventList[eventName];
                        }else{
                            for( eventList = event.list, i = eventList.length; i; )
                                if( eventList[--i].fn === fn )
                                    eventList.splice( i, 1 );

                            if( !eventList.length )
                                delete this.eventList[eventName];
                            else
                                eventBuilder( event, this );
                        }
                    }
                }
            }

            return this;
        },
        /*
         Function: set

         Set parameter with events
         */

        set: function( param, value ){
            var oldValue = this[ param ];
            if( this.fireEvent( param + 'BeforeSet', value, oldValue ) === false )
                return false;
            this[ param ] = value;
            this.fireEvent( param + 'Set', value, oldValue );
            return value;
        },

        _unbindListeners: function (name) {
            var __listeners = this[ name || '__listeners' ], i;

            if (__listeners) {
                for( i in __listeners ){
                    if( __listeners.hasOwnProperty( i ) ){
                        var item = __listeners[i];
                        if( item && typeof item.remove === 'function' )
                            item.remove();
                        else if( typeof item === 'function' )
                            item();
                    }
                }

            }
        },

        _initListeners: function () {
            this.__listeners = {};
        }
    };
    proto.fire = proto.fireEvent;
    Z.Observable = function(){
        this._init();
    };
    Z.Observable.prototype = proto;
    return Z.Observable;
})();
