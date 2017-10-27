/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * *
 */
;// QUOKKA 2017
// By zibx on 10/26/17.

var observable = require('../lib/z-observable');

var assert = require('chai').assert;

describe('observable', function() {

    it('should subscribe and fire', function(done){
        var o = {};
        o.__proto__ = new observable();
        assert.equal(o.on('evt1', function(){
            done()
        }), o);
        o.fire('evt1');
    });

    it('should support more subscribers', function(){
        var o = {};
        o.__proto__ = new observable();
        var counter = 0;
        o.on('evt1', function(){
            counter++;
        });
        o.on('evt1', function(){
            counter+=10;
        });
        o.on('evt1', function(){
            counter+=100;
        });
        for(var i = 0; i < 7; i++){
            o.fire( 'evt1' );
        }

        assert.equal(counter, 777);
    });


    it('should be able to unsubscribe', function(){

        var o = new observable(), s = [];

        var counter = 0;
        s.push(o.removableOn('evt1', function(){
            counter++;
        }));
        s.push(o.removableOn('evt1', function(){
            counter+=10;
        }));
        s.push(o.removableOn('evt1', function(){
            counter+=100;
        }));
        for(var i = 0; i < 7; i++){
            o.fire( 'evt1' );
        }

        while(s.length)
            s.pop().remove();

        for(var i = 0; i < 3; i++){
            o.fire( 'evt1' );
        }

        assert.equal(counter, 777);
    });

    it('should be able to subscribe once', function(){
        var o = new observable(), s = [];
        var counter = 0;

        /** this is integration */
        s.push(o.removableOn('evt1', function(){
            counter++;
        }));
        s.push(o.removableOn('evt1', function(){
            counter+=10;
        }));
        s.push(o.removableOn('evt1', function(){
            counter+=100;
        }));

        /** this is test case */
        s.push(o.removableOnce('evt1', function(){
            counter+=1000;
        }));

        for(var i = 0; i < 7; i++){
            o.fire( 'evt1' );
        }

        while(s.length)
            s.pop().remove();

        for(var i = 0; i < 3; i++){
            o.fire( 'evt1' );
        }

        assert.equal(counter, 1777);
    });
    it('should pass and save scopes', function(){
        var o = new observable(), s = [], obj = {a:1};

        var counter = 0;
        s.push(o.removableOn('evt1', function(){
            counter++;
            assert.equal(this, o);
        }));

        s.push(o.removableOn('evt1', function(){
            counter+=10;
            assert.equal(this, s);
        }, s));
        s.push(o.removableOn('evt1', function(){
            counter+=100;

        }));

        s.push(o.removableOnce('evt1', function(){
            counter+=1000;
            assert.equal(this, s);
        }, s));

        s.push(o.removableOnce('evt1', function(){
            counter+=10000;
            assert.equal(this, obj);
        }, obj));


        for(var i = 0; i < 7; i++){
            o.fire( 'evt1' );
        }

        while(s.length)
            s.pop().remove();

        for(var i = 0; i < 3; i++){
            o.fire( 'evt1' );
        }

        assert.equal(counter, 11777);
    });


});
