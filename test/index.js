// Load modules

var Lab = require('lab');
var Path = require('path');
var Joi = require('../lib');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;
var Validate = require('./helper');


describe('Joi', function () {

    it('validates object', function (done) {

        var schema = Joi.object({
            a: Joi.number().min(0).max(3),
            b: Joi.string().valid('a', 'b', 'c'),
            c: Joi.string().email().optional()
        }).without('a', 'none');

        var obj = {
            a: 1,
            b: 'a',
            c: 'joe@example.com'
        };

        schema.validate(obj, function (err, value) {

            expect(err).to.not.exist;
            done();
        });
    });

    it('keeps schema immutable', function (done) {

        var a = Joi.string();
        var b = a.valid('b');

        Validate(a, [
            ['a', true],
            ['b', true],
            [5, false]
        ]);

        Validate(b, [
            ['a', false],
            ['b', true],
            [5, false]
        ]);

        done();
    });

    it('validates null', function (done) {

        Joi.string().validate(null, function (err, value) {

            expect(err).to.exist;
            expect(err.annotate()).to.equal('{\n  \u001b[41m\"value\"\u001b[0m\u001b[31m [1]: -- missing --\u001b[0m\n}\n\u001b[31m\n[1] value is not allowed to be null\u001b[0m');
            done();
        });
    });

    it('validates null schema', function (done) {

        Validate(null, [
            ['a', false],
            [null, true]
        ]);
        done();
    });

    it('validates number literal', function (done) {

        Validate(5, [
            [6, false],
            [5, true]
        ]);
        done();
    });

    it('validates string literal', function (done) {

        Validate('5', [
            ['6', false],
            ['5', true]
        ]);
        done();
    });

    it('validates boolean literal', function (done) {

        Validate(true, [
            [false, false],
            [true, true]
        ]);
        done();
    });

    it('validates date literal', function (done) {

        var now = Date.now();
        Validate(new Date(now), [
            [new Date(now), true],
            [now, true],
            [now * 2, false]
        ]);
        done();
    });

    it('validates complex literal', function (done) {

        var schema = ['key', 5, { a: true, b: [/^a/, 'boom'] }];
        Validate(schema, [
            ['key', true],
            [5, true],
            ['other', false],
            [6, false],
            [{ c: 5 }, false],
            [{}, true],
            [{ b: 'abc' }, true],
            [{ a: true, b: 'boom' }, true],
            [{ a: 5, b: 'a' }, false]
        ]);
        done();
    });

    it('validates a compiled complex literal', function (done) {

        var schema = Joi.compile(['key', 5, { a: true, b: [/^a/, 'boom'] }]);
        Validate(schema, [
            ['key', true],
            [5, true],
            ['other', false],
            [6, false],
            [{ c: 5 }, false],
            [{}, true],
            [{ b: 'abc' }, true],
            [{ a: true, b: 'boom' }, true],
            [{ a: 5, b: 'a' }, false]
        ]);
        done();
    });

    it('validates regex directly', function (done) {

        Joi.compile(/^5$/).validate('5', function (err, value) {

            expect(err).to.not.exist;
            Joi.compile(/.{2}/).validate('6', function (err, value) {

                expect(err).to.exist;
                done();
            });
        });
    });

    it('validated with', function (done) {

        var schema = Joi.object({
            txt: Joi.string(),
            upc: Joi.string()
        }).with('txt', 'upc');

        Joi.validate({ txt: 'a' }, schema, { abortEarly: false }, function (err, value) {

            expect(err.message).to.equal('txt missing required peer upc');

            Validate(schema, [
                [{ upc: 'test' }, true],
                [{ txt: 'test' }, false],
                [{ txt: 'test', upc: null }, false],
                [{ txt: 'test', upc: '' }, false],
                [{ txt: 'test', upc: undefined }, false],
                [{ txt: 'test', upc: 'test' }, true]
            ]);

            done();
        });
    });

    it('validated without', function (done) {

        var schema = Joi.object({
            txt: Joi.string(),
            upc: Joi.string()
        }).without('txt', 'upc');

        Joi.validate({ txt: 'a', upc: 'b' }, schema, { abortEarly: false }, function (err, value) {

            expect(err.message).to.equal('txt conflict with forbidden peer upc');

            Validate(schema, [
                [{ upc: 'test' }, true],
                [{ txt: 'test' }, true],
                [{ txt: 'test', upc: null }, false],
                [{ txt: 'test', upc: '' }, false],
                [{ txt: 'test', upc: undefined }, true],
                [{ txt: 'test', upc: 'test' }, false]
            ]);

            done();
        });
    });

    it('validates xor', function (done) {

        var schema = Joi.object({
            txt: Joi.string(),
            upc: Joi.string()
        }).xor('txt', 'upc');

        Joi.validate({}, schema, { abortEarly: false }, function (err, value) {

            expect(err.message).to.equal('at least one of txt, upc is required');

            Validate(schema, [
                [{ upc: null }, false],
                [{ upc: 'test' }, true],
                [{ txt: null }, false],
                [{ txt: 'test' }, true],
                [{ txt: 'test', upc: null }, false],
                [{ txt: 'test', upc: '' }, false],
                [{ txt: '', upc: 'test' }, false],
                [{ txt: null, upc: 'test' }, false],
                [{ txt: undefined, upc: 'test' }, true],
                [{ txt: 'test', upc: undefined }, true],
                [{ txt: 'test', upc: '' }, false],
                [{ txt: 'test', upc: null }, false],
                [{ txt: '', upc: undefined }, false],
                [{ txt: '', upc: '' }, false],
                [{ txt: 'test', upc: 'test' }, false]
            ]);

            done();
        });
    });

    it('validates multiple peers xor', function (done) {

        var schema = Joi.object({
            txt: Joi.string(),
            upc: Joi.string(),
            code: Joi.string()
        }).xor('txt', 'upc', 'code');

        Validate(schema, [
            [{ upc: 'test' }, true],
            [{ txt: 'test' }, true],
            [{}, false]
        ]);

        done();
    });

    it('validates xor with number types', function (done) {

        var schema = Joi.object({
            code: Joi.number(),
            upc: Joi.number()
        }).xor('code', 'upc');

        Validate(schema, [
            [{ upc: 123 }, true],
            [{ code: 456 }, true],
            [{ code: 456, upc: 123 }, false],
            [{}, false]
        ]);

        done();
    });

    it('validates xor when empty value of peer allowed', function (done) {

        var schema = Joi.object({
            code: Joi.string(),
            upc: Joi.string().allow('')
        }).xor('code', 'upc');

        Validate(schema, [
            [{ upc: '' }, true],
            [{ upc: '123' }, true],
            [{ code: '456' }, true],
            [{ code: '456', upc: '' }, false],
            [{}, false]
        ]);

        done();
    });

    it('validates or', function (done) {

        var schema = Joi.object({
            txt: Joi.string(),
            upc: Joi.string().allow(null, ''),
            code: Joi.number()
        }).or('txt', 'upc', 'code');

        Joi.validate({}, schema, { abortEarly: false }, function (err, value) {

            expect(err.message).to.equal('missing at least one of alternative peers txt, upc, code');

            Validate(schema, [
                [{ upc: null }, true],
                [{ upc: 'test' }, true],
                [{ txt: null }, false],
                [{ txt: 'test' }, true],
                [{ code: null }, false],
                [{ code: 123 }, true],
                [{ txt: 'test', upc: null }, true],
                [{ txt: 'test', upc: '' }, true],
                [{ txt: '', upc: 'test' }, false],
                [{ txt: null, upc: 'test' }, false],
                [{ txt: undefined, upc: 'test' }, true],
                [{ txt: 'test', upc: undefined }, true],
                [{ txt: 'test', upc: '' }, true],
                [{ txt: 'test', upc: null }, true],
                [{ txt: '', upc: undefined }, false],
                [{ txt: '', upc: undefined, code: 999 }, false],
                [{ txt: '', upc: undefined, code: undefined }, false],
                [{ txt: '', upc: '' }, false],
                [{ txt: 'test', upc: 'test' }, true],
                [{ txt: 'test', upc: 'test', code: 322 }, true]
            ]);

            done();
        });
    });

    it('validates and', function (done) {

        var schema = Joi.object({
            txt: Joi.string(),
            upc: Joi.string().allow(null, ''),
            code: Joi.number()
        }).and('txt', 'upc', 'code');

        Joi.validate({ txt: 'x' }, schema, { abortEarly: false }, function (err, value) {

            expect(err.message).to.equal('txt missing required peers upc, code');

            Validate(schema, [
                [{ upc: null }, false],
                [{ upc: 'test' }, false],
                [{ txt: null }, false],
                [{ txt: 'test' }, false],
                [{ code: null }, false],
                [{ code: 123 }, false],
                [{ txt: 'test', upc: null }, false],
                [{ txt: 'test', upc: '' }, false],
                [{ txt: '', upc: 'test' }, false],
                [{ txt: null, upc: 'test' }, false],
                [{ txt: undefined, upc: 'test' }, false],
                [{ txt: 'test', upc: undefined }, false],
                [{ txt: 'test', upc: '' }, false],
                [{ txt: 'test', upc: null }, false],
                [{ txt: '', upc: undefined }, false],
                [{ txt: '', upc: undefined, code: 999 }, false],
                [{ txt: '', upc: undefined, code: undefined }, false],
                [{ txt: '', upc: '' }, false],
                [{ txt: 'test', upc: 'test' }, false],
                [{ txt: 'test', upc: 'test', code: 322 }, true],
                [{ txt: 'test', upc: null, code: 322 }, true]
            ]);

            done();
        });
    });

    it('validates an array of valid types', function (done) {

        var schema = Joi.object({
            auth: [
                Joi.object({
                    mode: Joi.string().valid('required', 'optional', 'try').allow(null)
                }).allow(null),
                Joi.string(),
                Joi.boolean()
            ]
        });

        schema.validate({ auth: { mode: 'none' } }, function (err, value) {

            expect(err).to.exist;
            expect(err.message).to.equal('mode must be one of required, optional, try, null. auth must be a string. auth must be a boolean');

            Validate(schema, [
                [{ auth: { mode: 'try' } }, true],
                [{ something: undefined }, false],
                [{ auth: { something: undefined } }, false],
                [{ auth: null }, true],
                [{ auth: undefined }, true],
                [{}, true],
                [{ auth: true }, true],
                [{ auth: 123 }, false]
            ]);

            done();
        });
    });

    it('validates alternatives', function (done) {

        var schema = Joi.object({
            auth: Joi.alternatives(
                Joi.object({
                    mode: Joi.string().valid('required', 'optional', 'try').allow(null)
                }).allow(null),
                Joi.string(),
                Joi.boolean()
            )
        });

        schema.validate({ auth: { mode: 'none' } }, function (err, value) {

            expect(err).to.exist;
            expect(err.message).to.equal('mode must be one of required, optional, try, null. auth must be a string. auth must be a boolean');

            Validate(schema, [
                [{ auth: { mode: 'try' } }, true],
                [{ something: undefined }, false],
                [{ auth: { something: undefined } }, false],
                [{ auth: null }, true],
                [{ auth: undefined }, true],
                [{}, true],
                [{ auth: true }, true],
                [{ auth: 123 }, false]
            ]);

            done();
        });
    });

    it('validates required alternatives', function (done) {

        var schema = {
            a: Joi.alternatives(
                Joi.string().required(),
                Joi.boolean().required()
            )
        };

        Validate(schema, [
            [{ a: null }, false],
            [{ a: undefined }, true],
            [{}, true],
            [{ a: true }, true],
            [{ a: 'true' }, true],
            [{ a: 123 }, false],
            [{ a: { c: 1 } }, false],
            [{ b: undefined }, false]
        ]);

        done();
    });

    it('validates required [] alternatives', function (done) {

        var schema = {
            a: [
                Joi.string().required(),
                Joi.boolean().required()
            ]
        };

        Validate(schema, [
            [{ a: null }, false],
            [{ a: undefined }, true],
            [{}, true],
            [{ a: true }, true],
            [{ a: 'true' }, true],
            [{ a: 123 }, false],
            [{ a: { c: 1 } }, false],
            [{ b: undefined }, false]
        ]);

        done();
    });

    it('validates an array of string with valid', function (done) {

        var schema = {
            brand: Joi.array().includes(Joi.string().valid('amex', 'visa'))
        };

        Validate(schema, [
            [{ brand: ['amex'] }, true],
            [{ brand: ['visa', 'mc'] }, false]
        ]);
        done();
    });

    it('validates pre and post convert value', function (done) {

        var schema = Joi.number().valid(5);

        Validate(schema, [
            [5, true],
            ['5', true]
        ]);
        done();
    });

    it('does not change object when validation fails', function (done) {

        var schema = Joi.object({
            a: Joi.number().valid(2)
        });

        var obj = {
            a: '5'
        };

        schema.validate(obj, function (err, value) {

            expect(err).to.exist;
            expect(value.a).to.equal('5');
            done();
        });
    });

    it('does not set optional keys when missing', function (done) {

        var schema = Joi.object({
            a: Joi.number()
        });

        var obj = {};

        schema.validate(obj, function (err, value) {

            expect(err).to.not.exist;
            expect(value.hasOwnProperty('a')).to.equal(false);
            done();
        });
    });

    it('invalidates pre and post convert value', function (done) {

        var schema = Joi.number().invalid(5);

        Validate(schema, [
            [5, false],
            ['5', false]
        ]);
        done();
    });

    it('invalidates missing peers', function (done) {

        var schema = Joi.object({
            username: Joi.string(),
            password: Joi.string()
        }).with('username', 'password').without('password', 'access_token');

        schema.validate({ username: 'bob' }, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('validates config where the root item is a joi type', function (done) {

        Joi.boolean().allow(null).validate(true, function (err, value) {

            expect(err).to.be.null;
            Joi.object().validate({ auth: { mode: 'try' } }, function (err, value) {

                expect(err).to.be.null;

                Joi.object().validate(true, function (err, value) {

                    expect(err.message).to.contain('value must be an object');

                    Joi.string().validate(true, function (err, value) {

                        expect(err.message).to.contain('value must be a string');

                        Joi.string().email().validate('test@test.com', function (err, value) {

                            expect(err).to.be.null;
                            Joi.object({ param: Joi.string().required() }).validate({ param: 'item' }, function (err, value) {

                                expect(err).to.be.null;
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it('converts string to number', function (done) {

        var schema = Joi.object({
            a: Joi.number()
        });

        var input = { a: '5' };
        schema.validate(input, function (err, value) {

            expect(err).to.be.null;
            expect(value.a).to.equal(5);
            expect(input.a).to.equal('5');
            done();
        });
    });

    it('allows unknown keys in objects if no schema was given', function (done) {

        Joi.object().validate({ foo: 'bar' }, function (err, value) {

            expect(err).to.not.exist;
            done();
        });
    });

    it('fails on unknown keys in objects if a schema was given', function (done) {

        Joi.object({}).validate({ foo: 'bar' }, function (err, value) {

            expect(err).to.exist;
            expect(err.message).to.equal('foo is not allowed');

            Joi.compile({}).validate({ foo: 'bar' }, function (err, value) {

                expect(err).to.exist;
                expect(err.message).to.equal('foo is not allowed');

                Joi.compile({ other: Joi.number() }).validate({ foo: 'bar' }, function (err, value) {

                    expect(err).to.exist;
                    expect(err.message).to.equal('foo is not allowed');

                    done();
                });
            });
        });
    });

    it('validates an unknown option', function (done) {

        var config = {
            auth: Joi.object({
                mode: Joi.string().valid('required', 'optional', 'try').allow(null)
            }).allow(null)
        };

        Joi.compile(config).validate({ auth: { unknown: true } }, function (err, value) {

            expect(err).to.not.be.null;
            expect(err.message).to.contain('unknown is not allowed');

            Joi.compile(config).validate({ something: false }, function (err, value) {

                expect(err).to.not.be.null;
                expect(err.message).to.contain('something is not allowed');

                done();
            });
        });
    });

    it('validates required key with multiple options', function (done) {

        var config = {
            module: Joi.alternatives([
                Joi.object({
                    compile: Joi.func().required(),
                    execute: Joi.func()
                }),
                Joi.string()
            ]).required()
        };

        Joi.compile(config).validate({}, function (err, value) {

            expect(err).to.exist;
            expect(err.message).to.contain('module is not allowed to be undefined');

            Joi.compile(config).validate({ module: 'test' }, function (err, value) {

                expect(err).to.be.null;

                Joi.compile(config).validate({ module: {} }, function (err, value) {

                    expect(err).to.not.be.null;
                    expect(err.message).to.contain('compile is not allowed to be undefined');
                    expect(err.message).to.contain('module must be a string');

                    Joi.compile(config).validate({ module: { compile: function () { } } }, function (err, value) {

                        expect(err).to.be.null;
                        done();
                    });
                });
            });
        });
    });

    it('validates key with required alternatives', function (done) {

        var config = {
            module: Joi.alt().try(
                Joi.object({
                    compile: Joi.func().required(),
                    execute: Joi.func()
                }).required(),
                Joi.string().required()
            )
        };

        Joi.compile(config).validate({}, function (err, value) {

            expect(err).to.not.exist;
            done();
        });
    });

    it('validates required key with alternatives', function (done) {

        var config = {
            module: Joi.alt().try(
                Joi.object({
                    compile: Joi.func().required(),
                    execute: Joi.func()
                }),
                Joi.string()
            ).required()
        };

        Joi.compile(config).validate({}, function (err, value) {

            expect(err).to.exist;
            expect(err.message).to.contain('module is not allowed to be undefined');
            done();
        });
    });

    it('does not require optional numbers', function (done) {

        var config = {
            position: Joi.number(),
            suggestion: Joi.string()
        };

        Joi.compile(config).validate({ suggestion: 'something' }, function (err, value) {

            expect(err).to.be.null;

            Joi.compile(config).validate({ position: 1 }, function (err, value) {

                expect(err).to.be.null;
                done();
            })
        });
    });

    it('does not require optional objects', function (done) {

        var config = {
            position: Joi.number(),
            suggestion: Joi.object()
        };

        Joi.compile(config).validate({ suggestion: {} }, function (err, value) {

            expect(err).to.be.null;

            Joi.compile(config).validate({ position: 1 }, function (err, value) {

                expect(err).to.be.null;
                done();
            });
        });
    });

    it('validates object successfully when config has an array of types', function (done) {

        var schema = {
            f: [Joi.number(), Joi.boolean()],
            g: [Joi.string(), Joi.object()]
        };

        var obj = {
            f: true,
            g: 'test'
        };

        Joi.compile(schema).validate(obj, function (err, value) {

            expect(err).to.not.exist;
            done();
        });
    });

    it('validates object successfully when config allows for optional key and key is missing', function (done) {

        var schema = {
            h: Joi.number(),
            i: Joi.string(),
            j: Joi.object()
        };

        var obj = {
            h: 12,
            i: 'test'
        };

        Joi.compile(schema).validate(obj, function (err, value) {

            expect(err).to.not.exist;
            done();
        });
    });

    it('fails validation', function (done) {

        var schema = {
            a: Joi.number().min(0).max(3),
            b: Joi.string().valid('a', 'b', 'c'),
            c: Joi.string().email().optional()
        };

        var obj = {
            a: 10,
            b: 'a',
            c: 'joe@example.com'
        };

        Joi.compile(schema).validate(obj, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('fails validation when the wrong types are supplied', function (done) {

        var schema = {
            a: Joi.number().min(0).max(3),
            b: Joi.string().valid('a', 'b', 'c'),
            c: Joi.string().email().optional()
        };

        var obj = {
            a: 'a',
            b: 'a',
            c: 'joe@example.com'
        };

        Joi.compile(schema).validate(obj, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('fails validation when missing a required parameter', function (done) {

        var obj = {
            c: 10
        };

        Joi.compile({ a: Joi.string().required() }).validate(obj, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('fails validation when missing a required parameter within an object config', function (done) {

        var obj = {
            a: {}
        };

        Joi.compile({ a: Joi.object({ b: Joi.string().required() }) }).validate(obj, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('fails validation when parameter is required to be an object but is given as string', function (done) {

        var obj = {
            a: 'a string'
        };

        Joi.compile({ a: Joi.object({ b: Joi.string().required() }) }).validate(obj, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('validates when parameter is required to be an object and is given correctly as a json string', function (done) {

        var schema = {
            a: Joi.object({
                b: Joi.string().required()
            })
        };

        var input = {
            a: '{"b":"string"}'
        };

        Joi.validate(input, schema, function (err, value) {

            expect(err).to.not.exist;
            expect(input.a).to.equal('{"b":"string"}');
            expect(value.a.b).to.equal('string');
            done();
        });
    });

    it('fails validation when parameter is required to be an object but is given as a json string that is incorrect (number instead of string)', function (done) {

        var obj = {
            a: '{"b":2}'
        };

        Joi.object({ a: Joi.object({ b: Joi.string().required() }) }).validate(obj, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('fails validation when parameter is required to be an Array but is given as string', function (done) {

        var obj = {
            a: "an array"
        };

        Joi.object({ a: Joi.array() }).validate(obj, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('validates when parameter is required to be an Array and is given correctly as a json string', function (done) {

        var obj = {
            a: '[1,2]'
        };

        Joi.object({ a: Joi.array() }).validate(obj, function (err, value) {

            expect(err).to.be.null;
            done();
        });
    });

    it('fails validation when parameter is required to be an Array but is given as a json that is incorrect (object instead of array)', function (done) {

        var obj = {
            a: '{"b":2}'
        };

        Joi.object({ a: Joi.object({ b: Joi.string().required() }) }).validate(obj, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('fails validation when config is an array and fails', function (done) {

        var schema = {
            d: [Joi.string(), Joi.boolean()],
            e: [Joi.number(), Joi.object()]
        };

        var obj = {
            d: 10,
            e: 'a'
        };

        Joi.compile(schema).validate(obj, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('fails validation when config is an array and fails with extra keys', function (done) {

        var schema = {
            d: [Joi.string(), Joi.boolean()],
            e: [Joi.number(), Joi.object()]
        };

        var obj = {
            a: 10,
            b: 'a'
        };

        Joi.compile(schema).validate(obj, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('fails validation with extra keys', function (done) {

        var schema = {
            a: Joi.number(),
        };

        var obj = {
            a: 1,
            b: 'a',
        };

        Joi.compile(schema).validate(obj, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('validates missing optional key with string condition', function (done) {

        var schema = {
            key: Joi.string().alphanum(false).min(8)
        };

        Joi.compile(schema).validate({}, function (err, value) {

            expect(err).to.not.exist;
            done();
        });
    });

    it('validates with extra keys and remove them when stripUnknown is set', function (done) {

        var schema = {
            a: Joi.number().min(0).max(3),
            b: Joi.string().valid('a', 'b', 'c'),
            c: Joi.string().email().optional()
        };

        var obj = {
            a: 1,
            b: 'a',
            d: 'c'
        };

        Joi.validate(obj, schema, { stripUnknown: true, allowUnknown: true }, function (err, value) {

            expect(err).to.be.null;
            expect(value).to.deep.equal({ a: 1, b: 'a' });
            done();
        });
    });

    it('fails to validate with incorrect property when asked to strip unkown keys without aborting early', function (done) {

        var schema = {
            a: Joi.number().min(0).max(3),
            b: Joi.string().valid('a', 'b', 'c'),
            c: Joi.string().email().optional()
        };

        var obj = {
            a: 1,
            b: 'f',
            d: 'c'
        };

        Joi.validate(obj, schema, { stripUnknown: true, abortEarly: false }, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('should pass validation with extra keys when allowUnknown is set', function (done) {

        var schema = {
            a: Joi.number().min(0).max(3),
            b: Joi.string().valid('a', 'b', 'c'),
            c: Joi.string().email().optional()
        };

        var obj = {
            a: 1,
            b: 'a',
            d: 'c'
        };

        Joi.validate(obj, schema, { allowUnknown: true }, function (err, value) {

            expect(err).to.be.null;
            expect(value).to.deep.equal({ a: 1, b: 'a', d: 'c' });
            done();
        });
    });

    it('should pass validation with extra keys set', function (done) {

        var localConfig = Joi.object({
            a: Joi.number().min(0).max(3),
            b: Joi.string().valid('a', 'b', 'c'),
        }).options({ allowUnknown: true });

        var obj = {
            a: 1,
            b: 'a',
            d: 'c'
        };

        localConfig.validate(obj, function (err, value) {

            expect(err).to.be.null;
            expect(value).to.deep.equal({ a: 1, b: 'a', d: 'c' });

            localConfig.validate(value, function (err, value) {

                expect(err).to.be.null;
                expect(value).to.deep.equal({ a: 1, b: 'a', d: 'c' });
                done();
            });
        });
    });


    it('should pass validation with extra keys and remove them when skipExtraKeys is set locally', function (done) {

        var localConfig = Joi.object({
            a: Joi.number().min(0).max(3),
            b: Joi.string().valid('a', 'b', 'c')
        }).options({ stripUnknown: true, allowUnknown: true });

        var obj = {
            a: 1,
            b: 'a',
            d: 'c'
        };

        localConfig.validate(obj, function (err, value) {

            expect(err).to.be.null;
            expect(value).to.deep.equal({ a: 1, b: 'a' });

            localConfig.validate(value, function (err, value) {

                expect(err).to.be.null;
                expect(value).to.deep.equal({ a: 1, b: 'a' });

                done();
            });
        });
    });

    it('should work when the skipFunctions setting is enabled', function (done) {

        var schema = Joi.object({ username: Joi.string() }).options({ skipFunctions: true });
        var input = { username: 'test', func: function () { } };
        Joi.validate(input, schema, function (err, value) {

            expect(err).to.not.exist;
            done();
        });
    });

    it('should work when the skipFunctions setting is disabled', function (done) {

        var schema = { username: Joi.string() };
        var input = { username: 'test', func: function () { } };

        Joi.validate(input, schema, { skipFunctions: false }, function (err, value) {

            expect(err).to.exist;
            expect(err.message).to.contain('func is not allowed');
            done();
        });
    });

    it('should not convert values when convert is false', function (done) {

        var schema = {
            arr: Joi.array().includes(Joi.string())
        };

        var input = { arr: 'foo' };
        Joi.validate(input, schema, { convert: false }, function (err, value) {

            expect(err).to.exist;
            done();
        });
    });

    it('full errors when abortEarly is false', function (done) {

        var schema = {
            a: Joi.string(),
            b: Joi.string()
        };

        var input = { a: 1, b: 2 };

        Joi.validate(input, schema, function (errOne, value) {

            Joi.validate(input, schema, { abortEarly: false }, function (errFull, value) {

                expect(errOne).to.exist
                expect(errFull).to.exist
                expect(errFull.details.length).to.be.greaterThan(errOne.details.length);
                done();
            });
        });
    });

    it('supports custom errors when validating types', function (done) {

        var schema = Joi.object({
            email: Joi.string().email(),
            date: Joi.date(),
            alphanum: Joi.string().alphanum(),
            min: Joi.string().min(3),
            max: Joi.string().max(3),
            required: Joi.string().required(),
            xor: Joi.string(),
            renamed: Joi.string().valid('456'),
            notEmpty: Joi.string().required()
        }).rename('renamed', 'required').without('required', 'xor').without('xor', 'required');

        var input = {
            email: 'invalid-email',
            date: 'invalid-date',
            alphanum: '\b\n\f\r\t',
            min: 'ab',
            max: 'abcd',
            required: 'hello',
            xor: '123',
            renamed: '456',
            notEmpty: ''
        };

        var lang = {
            any: {
                empty: '3'
            },
            date: {
                base: '18'
            },
            string: {
                base: '13',
                min: '14',
                max: '15',
                alphanum: '16',
                email: '19'
            },
            object: {
                without: '7',
                rename: {
                    override: '11'
                }
            }
        };

        Joi.validate(input, schema, { abortEarly: false, language: lang }, function (err, value) {

            expect(err).to.exist;
            expect(err.message).to.equal('11. 7. 7. 19. 18. 16. 14. 15. 3. 13');
            done();
        });
    });

    it('returns error type in validation error', function (done) {

        var input = {
            notNumber: '',
            notString: true,
            notBoolean: 9
        };

        var schema = {
            notNumber: Joi.number().required(),
            notString: Joi.string().required(),
            notBoolean: Joi.boolean().required()
        }

        Joi.validate(input, schema, { abortEarly: false }, function (err, value) {

            expect(err).to.exist;
            expect(err.details).to.have.length(3);
            expect(err.details[0].type).to.equal('number.base');
            expect(err.details[1].type).to.equal('string.base');
            expect(err.details[2].type).to.equal('boolean.base');
            done();
        });
    });

    it('annotates error', function (done) {

        var object = {
            a: 'm',
            y: {
                b: {
                    c: 10
                }
            }
        };

        var schema = {
            a: Joi.string().valid('a', 'b', 'c', 'd'),
            y: Joi.object({
                u: Joi.string().valid(['e', 'f', 'g', 'h']).required(),
                b: Joi.string().valid('i', 'j').allow(false),
                d: Joi.object({
                    x: Joi.string().valid('k', 'l').required(),
                    c: Joi.number()
                })
            })
        };

        Joi.validate(object, schema, { abortEarly: false }, function (err, value) {

            expect(err).to.exist;
            expect(err.annotate()).to.equal('{\n  \"y\": {\n    \"b\" \u001b[31m[1]\u001b[0m: {\n      \"c\": 10\n    },\n    \u001b[41m\"u\"\u001b[0m\u001b[31m [2]: -- missing --\u001b[0m\n  },\n  \"a\" \u001b[31m[3]\u001b[0m: \"m\"\n}\n\u001b[31m\n[1] a must be one of a, b, c, d\n[2] u is not allowed to be undefined\n[3] b must be a string\u001b[0m');
            done();
        });
    });

    it('validates using the root any object', function (done) {

        var any = Joi;
        any.validate('abc', function (err, value) {

            expect(err).to.not.exist;
            done();
        });
    });

    describe('#describe', function () {

        var schema = Joi.object({
            sub: {
                email: Joi.string().email(),
                date: Joi.date(),
                child: Joi.object({
                    alphanum: Joi.string().alphanum()
                }),
            },
            min: [Joi.number(), Joi.string().min(3)],
            max: Joi.string().max(3),
            required: Joi.string().required(),
            xor: Joi.string(),
            renamed: Joi.string().valid('456'),
            notEmpty: Joi.string().required().description('a').notes('b').tags('c')
        }).rename('renamed', 'required').without('required', 'xor').without('xor', 'required');

        var result = {
            type: 'object',
            valids: [undefined],
            invalids: [null],
            children: {
                sub: {
                    type: 'object',
                    valids: [undefined],
                    invalids: [null],
                    children: {
                        email: {
                            type: 'string',
                            valids: [undefined],
                            invalids: [null, ''],
                            rules: [{ name: 'email' }]
                        },
                        date: {
                            type: 'date',
                            valids: [undefined],
                            invalids: [null]
                        },
                        child: {
                            type: 'object',
                            valids: [undefined],
                            invalids: [null],
                            children: {
                                alphanum: {
                                    type: 'string',
                                    valids: [undefined],
                                    invalids: [null, ''],
                                    rules: [{ name: 'alphanum' }]
                                }
                            }
                        }
                    }
                },
                min: [
                    {
                        type: 'number',
                        valids: [undefined],
                        invalids: [null]
                    },
                    {
                        type: 'string',
                        valids: [undefined],
                        invalids: [null, ''],
                        rules: [{ name: 'min', arg: 3 }]
                    }
                ],
                max: {
                    type: 'string',
                    valids: [undefined],
                    invalids: [null, ''],
                    rules: [{ name: 'max', arg: 3 }]
                },
                required: {
                    type: 'string',
                    invalids: [null, '', undefined]
                },
                xor: {
                    type: 'string',
                    valids: [undefined],
                    invalids: [null, '']
                },
                renamed: {
                    type: 'string',
                    flags: {
                        allowOnly: true
                    },
                    valids: [undefined, '456'],
                    invalids: [null, '']
                },
                notEmpty: {
                    type: 'string',
                    description: 'a',
                    notes: ['b'],
                    tags: ['c'],
                    invalids: [null, '', undefined]
                }
            },
            dependencies: [
                {
                    type: 'without',
                    key: 'required',
                    peers: ['xor']
                },
                {
                    type: 'without',
                    key: 'xor',
                    peers: ['required']
                }
            ]
        };

        it('describes schema (direct)', function (done) {

            var description = schema.describe();
            expect(description).to.deep.equal(result);
            done();
        });

        it('describes schema (root)', function (done) {

            var description = Joi.describe(schema);
            expect(description).to.deep.equal(result);
            done();
        });

        it('describes schema (any)', function (done) {

            var any = Joi;
            var description = any.describe();
            expect(description).to.deep.equal({
                type: 'any',
                valids: [undefined],
                invalids: [null]
            });
            done();
        });

        it('describes schema without invalids', function (done) {

            var description = Joi.allow(null).describe();
            expect(description.invalids).to.not.exist;
            done();
        })
    });
});
