import { USER_ROLES, ORGANIZATION_TYPES, UserRole, OrganizationType } from '../constants';

describe('Constants', () => {
    describe('USER_ROLES', () => {
        it('should contain exactly 4 roles', () => {
            expect(USER_ROLES).toHaveLength(4);
        });

        it('should include donor, ngo, volunteer, and admin', () => {
            expect(USER_ROLES).toContain('donor');
            expect(USER_ROLES).toContain('ngo');
            expect(USER_ROLES).toContain('volunteer');
            expect(USER_ROLES).toContain('admin');
        });

        it('should be readonly', () => {
            // TypeScript ensures this at compile time, but we verify the values are stable
            const rolesCopy = [...USER_ROLES];
            expect(rolesCopy).toEqual(['donor', 'ngo', 'volunteer', 'admin']);
        });
    });

    describe('ORGANIZATION_TYPES', () => {
        it('should contain exactly 5 organization types', () => {
            expect(ORGANIZATION_TYPES).toHaveLength(5);
        });

        it('should include all expected organization types', () => {
            expect(ORGANIZATION_TYPES).toContain('restaurant');
            expect(ORGANIZATION_TYPES).toContain('canteen');
            expect(ORGANIZATION_TYPES).toContain('event');
            expect(ORGANIZATION_TYPES).toContain('shelter');
            expect(ORGANIZATION_TYPES).toContain('individual');
        });

        it('should be readonly', () => {
            const typesCopy = [...ORGANIZATION_TYPES];
            expect(typesCopy).toEqual(['restaurant', 'canteen', 'event', 'shelter', 'individual']);
        });
    });

    describe('Type aliases', () => {
        it('should accept valid UserRole values', () => {
            const validRoles: UserRole[] = ['donor', 'ngo', 'volunteer', 'admin'];
            validRoles.forEach(role => {
                expect(USER_ROLES).toContain(role);
            });
        });

        it('should accept valid OrganizationType values', () => {
            const validTypes: OrganizationType[] = ['restaurant', 'canteen', 'event', 'shelter', 'individual'];
            validTypes.forEach(type => {
                expect(ORGANIZATION_TYPES).toContain(type);
            });
        });
    });
});
