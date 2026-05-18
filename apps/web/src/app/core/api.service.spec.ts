import { ApiService } from './api.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('calls getLiveGames with required query params', () => {
    service.getLiveGames(['1'], ['nfl']).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/api/games/live'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('teamIds')).toBe('1');
    expect(req.request.params.get('sports')).toBe('nfl');
    req.flush({ data: [], meta: {} });
  });

  it('calls getUpcomingGames with required query params', () => {
    service.getUpcomingGames(['1'], ['nba']).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/api/games/upcoming'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('teamIds')).toBe('1');
    expect(req.request.params.get('sports')).toBe('nba');
    req.flush({ data: [], meta: {} });
  });

  it('calls getRecentGames with days param', () => {
    service.getRecentGames(['1'], ['mlb'], 7).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/api/games/recent'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('teamIds')).toBe('1');
    expect(req.request.params.get('sports')).toBe('mlb');
    expect(req.request.params.get('days')).toBe('7');
    req.flush({ data: [], meta: {} });
  });

  it('calls getGameDetail with sport query param', () => {
    service.getGameDetail('nfl', 'evt-1').subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/api/games/evt-1'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('sport')).toBe('nfl');
    req.flush({ data: [], meta: {} });
  });
});
