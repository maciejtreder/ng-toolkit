describe('Basic tests', () => {
    it('true is true', () => {
        expect(true).toBe(true);
    });
    it('always fail', () => {
        expect(true).toBeFalsy();
    })
});