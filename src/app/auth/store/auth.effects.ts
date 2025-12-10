import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { Actions, createEffect, ofType } from '@ngrx/effects'
import { of } from 'rxjs'
import { catchError, map, switchMap, tap } from 'rxjs/operators'
import { AuthService } from '../auth.service'
import { AuthUser } from '../auth-user.model'

import * as AuthActions from './auth.actions'
import { environment } from "../../../environments/environment";

export interface AuthResponseData {
  username: string,
  role: string,
  token: string
}

const handleAuthentication = (username: string, role: string, token: string) => {
  const expiresIn = 3600
  const expirationDuration = new Date(
    new Date().getTime() + +expiresIn * 1000
  )

  const expirationDate = new Date(new Date().getTime() + +expiresIn * 1000)
  const user = new AuthUser(username, role, token, expirationDate)

  localStorage.setItem('userData', JSON.stringify(user))
  return new AuthActions.AuthenticateSuccess({
    username: username,
    role: role,
    token: token,
    expirationDate: expirationDate,
    redirect: true
  })
}

const handleError = (errorResponse: any) => {
  // error handling code
  let errorMessage = 'An unknown error occurred!'
  if (!errorResponse.error || !errorResponse.error.error) {
    return of(new AuthActions.AuthenticateFail(errorMessage))
  }
  // console.log(errorResponse.error.error.message)

  switch (errorResponse.error.error.message) {
    case 'EMAIL_EXISTS':
      errorMessage = 'This email exists already.'
      break
    case 'INVALID_PASSWORD':
      errorMessage = 'This password is not correct.'
      break
    case 'EMAIL_NOT_FOUND':
      errorMessage = 'This email does not exist.'
      break
  }
  return of(new AuthActions.AuthenticateFail(errorMessage))
}

@Injectable()
export class AuthEffects {
  apiUrl = environment.apiUrl + '/auth/'

  // this authLogin observable should never die, therefore never throw error
  authLogin = createEffect(() => this.actions$.pipe(
    // login start triggers this authLogin
    ofType(AuthActions.LOGIN_START),
    switchMap((authData: AuthActions.LoginStart) => {
      return this.http.post<AuthResponseData>(
        this.apiUrl + 'login',
        {
          username: authData.payload.username,
          password: authData.payload.password
        }
      ).pipe(
        tap(resData => {
          this.authService.setLogoutTimer(3600 * 1000)
        }),
        map(resData => {
          return handleAuthentication(resData.username, resData.role, resData.token)
        }),
        catchError(errorResponse => {
          return handleError(errorResponse)
        })
      )
    }),
  ))

  authSuccess = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.AUTHENTICATE_SUCCESS, AuthActions.LOGOUT),
    tap((authSuccessAction: AuthActions.AuthenticateSuccess) => {
      if (authSuccessAction.payload && authSuccessAction.payload.redirect) {
        this.router.navigate(['/dashboard']);
      }
    })
  ), { dispatch: false })

  autoLogin = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.AUTO_LOGIN),
    map(() => {

      const userData: {
        _username: string
        _role: string,
        _token: string
        _tokenExpirationDate: string
      } = JSON.parse(localStorage.getItem('userData'))
      if (!userData) {
        return { type: 'DUMMY' }
      }
      const loadedUser = new AuthUser(
        userData._username,
        userData._role,
        userData._token,
        new Date(userData._tokenExpirationDate)
      )

      if (loadedUser.token) {
        const expirationDuration = new Date(userData._tokenExpirationDate).getTime() - new Date().getTime()
        if (expirationDuration <= 0) {
          return { type: 'DUMMY' }
        }
        this.authService.setLogoutTimer(expirationDuration)

        return new AuthActions.AuthenticateSuccess({
          username: loadedUser.username,
          role: loadedUser.role,
          token: loadedUser.token,
          expirationDate: new Date(userData._tokenExpirationDate),
          redirect: false
        })
      }
      return { type: 'DUMMY' }
    })
  ))

  authLogout = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.LOGOUT),
    tap(() => {
      this.authService.clearLogoutTimer()
      localStorage.removeItem('userData')
      this.router.navigate(['/auth'])
    })
  ), { dispatch: false })

  forgotPassword = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.FORGOT_PASSWORD_START),
    switchMap((action: AuthActions.ForgotPasswordStart) => {
      return this.http.post<{ message: string }>(
        this.apiUrl + 'forgot-password',
        { email: action.payload.email }
      ).pipe(
        map(response => {
          return new AuthActions.ForgotPasswordSuccess('If the email exists, a password reset link has been sent.')
        }),
        catchError(error => {
          return of(new AuthActions.ForgotPasswordFail('Failed to send reset email. Please try again.'))
        })
      )
    })
  ))

  resetPassword = createEffect(() => this.actions$.pipe(
    ofType(AuthActions.RESET_PASSWORD_START),
    switchMap((action: AuthActions.ResetPasswordStart) => {
      return this.http.post<{ message: string }>(
        this.apiUrl + 'reset-password',
        { token: action.payload.token, newPassword: action.payload.newPassword }
      ).pipe(
        map(response => {
          return new AuthActions.ResetPasswordSuccess('Password has been reset successfully. You can now login.')
        }),
        catchError(error => {
          const message = error.error?.message || 'Failed to reset password. Token may be invalid or expired.'
          return of(new AuthActions.ResetPasswordFail(message))
        })
      )
    })
  ))

  // $ - observable, optional
  constructor(
    private actions$: Actions,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
  ) { }
}
