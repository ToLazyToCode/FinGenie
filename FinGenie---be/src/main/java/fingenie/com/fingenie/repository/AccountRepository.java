package fingenie.com.fingenie.repository;

import fingenie.com.fingenie.entity.Account;
import fingenie.com.fingenie.entity.Account.AuthProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByEmail(String email);
    boolean existsByEmail(String email);
    
    /**
     * Find account by OAuth provider and provider-specific user ID
     * Used to match returning OAuth users
     */
    Optional<Account> findByProviderAndProviderId(AuthProvider provider, String providerId);
    
    /**
     * Check if an OAuth account exists for this provider/id combo
     */
    boolean existsByProviderAndProviderId(AuthProvider provider, String providerId);
    
    /**
     * Search users by email or name (case-insensitive partial match)
     * Excludes the current user from results
     */
    @Query("SELECT a FROM Account a WHERE a.id <> :currentUserId " +
           "AND (LOWER(a.email) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(a.name) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Account> searchByEmailOrName(@Param("query") String query, 
                                       @Param("currentUserId") Long currentUserId, 
                                       Pageable pageable);
}
