import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
    isAuthorized: boolean;
}

const initialState: AuthState = {
    isAuthorized: false,
};

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAuthorized(state, action: PayloadAction<boolean>) {
            state.isAuthorized = action.payload;
        },
    },
});

export const { setAuthorized } = authSlice.actions;
export default authSlice.reducer;
