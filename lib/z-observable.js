/**
 * Created by Ivan on 10/19/2014.
 */

(function(ClassLoader, js){
    'use strict';
    var Z = require('z-lib');

    var slice = Array.prototype.slice;
    var eventBuilder = function( el, scope ){
        var out = [scope],
            txt = [], names = [], counter = 0, fireFn;
        Z.each( el.list, function( el ){

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

            var data = slice.call( arguments, 1 ),
                event = this.eventList[ eventName ],
                allEvents = this.eventList[ '*' ],
                prevented;

            //eventName !== 'mousemove' && console.log(eventName, data, this._className, this.innerEl, this.el);
            allEvents && allEvents.fn(slice.call( arguments ));

            if( event )
                return event.fn( data );
            else{
                prevented = false;
                if( this.listeners && this.listeners[ eventName ] ){
                    event = [ { fn: this.listeners[ eventName ], caller: this } ];
                    var i, subscriber, dataLength = data.length;

                    /*debug cut*/
                    /*if( event.length > 10 ){
                     console.warn('Strange event `'+ eventName +'`, ' + event.length + ' handlers attached')
                     }*//*/debug cut*/
                    for( i = event.length; i ; ){
                        subscriber = event[ --i ];
                        data[ dataLength ] = subscriber.caller;
                        prevented = prevented || subscriber.fn.apply( subscriber.caller || subscriber, data ) === false;
                    }

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
            if( typeof eventName !== 'string' ){ // object of events
                for( var i in eventName ){
                    if( eventName.hasOwnProperty( i ) )
                        this.on( i, eventName[ i ] );
                }
            }else{
                if( eventName.indexOf(',') > -1 ){
                    Z.each( eventName.split(','), function( eventName ){
                        this.on( eventName.trim(), fn, caller );
                    }.bind(this) );
                }else{
                    var eventList = this.eventList,
                        data = {fn : fn, caller : caller || this };

                    !eventList && (eventList = {});
                    (eventList[eventName] || ( eventList[eventName] = { list: [] } )).list.push( data );
                    eventList[eventName] = { list: eventList[eventName].list.slice() };
                    if( eventList[eventName].list.length > 10 ){
                        window.console.warn('Strange event `'+ eventName +'`, ' + eventList[ eventName ].length + ' handlers attached');
                    }/*/debug cut*/
                    eventBuilder( eventList[eventName], this );
                }
            }
            return this;
        },

        once: function( name, fn, scope ){
            var wrap = function(){
                fn.apply(scope, Z.toArray(arguments));
                this.un(name, wrap);
            };
            this.on( name, wrap, this );
        },
        removableOn: function( eventName, fn, caller ){
            var wrap = function(){
                fn.apply(caller, Z.toArray(arguments));
            };
            this.on( eventName, wrap, this );

            return {remove: function(  ){
                this.un(eventName, wrap);
            }.bind(this)};

        },
        /*
         Function: un

         Unsubscribe callback for event. It's important that fn shoul be same function pointer, that was pased in <on>

         Parameters:
         eventName - name of event
         fn - callback function

         */
        un : function un( eventName, fn ){
            var event = this.eventList[ eventName ],
                i, eventList;



            if( event !== undefined )
                if( fn === undefined )
                    delete this.eventList[ eventName ];
                else{
                    for( eventList = event.list, i = eventList.length ; i ; )
                        if( eventList[ --i ].fn === fn )
                            eventList.splice( i, 1 );

                    if( !eventList.length )
                        delete this.eventList[ eventName ];
                    else
                        eventBuilder( event, this );
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

        _unbindListeners: function () {
            var listen = this[ arguments[0] || 'listen' ];

            if (listen) {
                Z.each(listen, function() {
                    if (this && typeof this.remove == "function")
                        this.remove();
                    else if (typeof this === 'function')
                        this();
                });
            }
        },

        _initListeners: function () {
            this.listen = {};
        }
    };
    proto.fire = proto.fireEvent;
    Z.Observable = function(){
        this._init();
    };
    Z.Observable.prototype = proto;
    return Z.Observable;
})();