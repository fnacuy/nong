const test = require('node:test');
const assert = require('node:assert/strict');

const pet = require('../src/services/pet');

function encodeVarintField(fieldNum, value) {
    const parts = [];
    const key = (fieldNum << 3) | 0;
    let k = BigInt(key);
    while (true) {
        const b = Number(k & 0x7Fn);
        k >>= 7n;
        if (k === 0n) { parts.push(b); break; }
        parts.push(b | 0x80);
    }
    let v = BigInt(value);
    while (true) {
        const b = Number(v & 0x7Fn);
        v >>= 7n;
        if (v === 0n) { parts.push(b); break; }
        parts.push(b | 0x80);
    }
    return Buffer.from(parts);
}

function encodeBytesField(fieldNum, data) {
    const parts = [];
    let k = BigInt((fieldNum << 3) | 2);
    while (true) {
        const b = Number(k & 0x7Fn);
        k >>= 7n;
        if (k === 0n) { parts.push(b); break; }
        parts.push(b | 0x80);
    }
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    let len = BigInt(buf.length);
    while (true) {
        const b = Number(len & 0x7Fn);
        len >>= 7n;
        if (len === 0n) { parts.push(b); break; }
        parts.push(b | 0x80);
    }
    return Buffer.concat([Buffer.from(parts), buf]);
}

test('DOG_TYPE_NAMES 包含 5 种狗', () => {
    assert.equal(Object.keys(pet.DOG_TYPE_NAMES).length, 5);
    assert.equal(pet.DOG_TYPE_NAMES[90021], '护主犬');
    assert.equal(pet.DOG_TYPE_NAMES[90001], '田园犬');
});

test('DOG_FOOD_IDS 与天数/秒数映射一致', () => {
    assert.deepEqual(pet.DOG_FOOD_IDS, [90004, 90005, 90006]);
    assert.equal(pet.DOG_FOOD_DAYS[90004], 1);
    assert.equal(pet.DOG_FOOD_DAYS[90005], 3);
    assert.equal(pet.DOG_FOOD_DAYS[90006], 5);
    assert.equal(pet.DOG_FOOD_SECS[90006], 432000);
});

test('DOG_QUALITY_NAMES 与颜色映射一致', () => {
    assert.deepEqual(pet.DOG_QUALITY_NAMES, { 100: '普通', 200: '稀有', 300: '珍品', 500: '天工' });
    assert.equal(pet.DOG_QUALITY_COLORS[500], '#a855f7');
});

test('parseRawFields 解析 varint 字段', () => {
    const raw = encodeVarintField(2, 90021);
    const fields = pet.parseRawFields(raw);
    assert.equal(fields.f2, 90021);
});

test('parseRawFields 解析可打印字符串字段', () => {
    const raw = encodeBytesField(4, Buffer.from('护主犬', 'utf-8'));
    const fields = pet.parseRawFields(raw);
    assert.equal(fields.f4, '护主犬');
});

test('parseRawFields 将不可打印字节转为 hex', () => {
    const raw = encodeBytesField(1, Buffer.from([0x00, 0x01, 0x02]));
    const fields = pet.parseRawFields(raw);
    assert.equal(fields.f1, '000102');
});

test('parseRawFields 解析多字段混合消息', () => {
    const f2 = encodeVarintField(2, 90021);
    const f3 = encodeVarintField(3, 86400);
    const raw = Buffer.concat([f2, f3]);
    const fields = pet.parseRawFields(raw);
    assert.equal(fields.f2, 90021);
    assert.equal(fields.f3, 86400);
});

test('parseRawFields 空输入返回空对象', () => {
    assert.deepEqual(pet.parseRawFields(Buffer.from([])), {});
    assert.deepEqual(pet.parseRawFields(null), {});
});
